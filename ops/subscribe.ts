import { createUnlink, unlinkAccount, unlinkEvm } from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  hexToBytes,
  http,
  keccak256,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { requestJson } from "./lib/backend-api";
import { serializeAccountKeys } from "./lib/account-keys";
import {
  buildSubscribeProofMessage,
  deriveAuthAccount,
} from "./lib/auth-key";
import {
  getErrorMessage,
  noopProgressLogger,
  startHeartbeat,
  type ProgressLogger,
} from "./lib/progress";
import {
  formatUsdc,
  getOptionalPositiveIntegerEnv,
  getRequiredEnv,
  normalizePrivateKey,
  waitForPrivateBalanceAtLeast,
} from "./lib/unlink-helpers";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

interface PlanDetailsResponse {
  id: string;
  name: string;
  amount: string;
  intervalSeconds: number;
  creator: {
    unlinkAddress: string;
    id: string;
  };
}

interface SubscribeResponse {
  subscriptionId: string;
  firstCharge: {
    txId: string | null;
    status: string;
  };
}

export async function subscribeToPlan(
  planIdParam?: string,
  params?: {
    log?: ProgressLogger;
  },
) {
  const log = params?.log ?? noopProgressLogger;
  const unlinkApiKey = getRequiredEnv("UNLINK_API_KEY");
  const unlinkApiEndpoint = getRequiredEnv("UNLINK_API_ENDPOINT");
  const pollIntervalMs = getOptionalPositiveIntegerEnv("UNLINK_POLL_INTERVAL_MS") ?? 3_000;
  const pollTimeoutMs = getOptionalPositiveIntegerEnv("UNLINK_POLL_TIMEOUT_MS") ?? 600_000;
  const heartbeatIntervalMs =
    getOptionalPositiveIntegerEnv("OPS_HEARTBEAT_INTERVAL_MS") ?? 15_000;

  const alicePrivateKey = normalizePrivateKey(getRequiredEnv("ALICE"), "ALICE");
  const aliceAccount = privateKeyToAccount(alicePrivateKey);

  const walletClient = createWalletClient({
    account: aliceAccount,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
  log("Deriving subscriber auth key", {
    walletAddress: aliceAccount.address,
  });
  const authAccount = await deriveAuthAccount({
    walletClient,
    evmAccount: aliceAccount,
  });
  log("Derived subscriber auth key", {
    authKeyId: authAccount.address.toLowerCase(),
  });

  const planId = planIdParam ?? getRequiredEnv("PLAN_ID");

  log("Fetching plan", {
    planId,
  });
  const fetchPlanStartedAt = Date.now();
  const planResponse = await requestJson<PlanDetailsResponse | { error: string }>({
    method: "GET",
    path: `/plans/${encodeURIComponent(planId)}`,
  });

  if (planResponse.status !== 200) {
    throw new Error(
      `Failed to fetch plan ${planId} (status=${planResponse.status}): ${JSON.stringify(planResponse.body)}`,
    );
  }

  const plan = planResponse.body as PlanDetailsResponse;
  log("Fetched plan", {
    planId: plan.id,
    amount: plan.amount,
    intervalSeconds: plan.intervalSeconds,
    creatorId: plan.creator.id,
    durationMs: Date.now() - fetchPlanStartedAt,
  });

  // Dedicated subscription accounts follow the spec's two-part derivation:
  // plan-specific seed + deterministic account index.
  const derivationIndex = Number(
    BigInt(keccak256(toHex(planId))) % 1_000_000n,
  );
  log("Deriving dedicated subscription account", {
    planId,
    derivationIndex,
  });

  const signed = await walletClient.signMessage({
    account: aliceAccount,
    message: `sublink:${planId}`,
  });
  const seedHex = keccak256(signed);

  const dedicatedAccount = unlinkAccount.fromSeed({
    seed: hexToBytes(seedHex),
    accountIndex: derivationIndex,
  });

  const unlinkClient = createUnlink({
    engineUrl: unlinkApiEndpoint,
    apiKey: unlinkApiKey,
    account: dedicatedAccount,
    evm: unlinkEvm.fromViem({
      walletClient,
      publicClient,
    }),
  });

  log("Ensuring subscriber dedicated Unlink account is registered");
  const stopRegisterHeartbeat = startHeartbeat({
    log,
    message: "Still waiting for subscriber account registration",
    intervalMs: heartbeatIntervalMs,
  });
  const registerStartedAt = Date.now();
  try {
    await unlinkClient.ensureRegistered();
  } catch (error) {
    log("Subscriber dedicated account registration failed", {
      durationMs: Date.now() - registerStartedAt,
      error: getErrorMessage(error),
    });
    throw error;
  } finally {
    stopRegisterHeartbeat();
  }
  const unlinkAddress = await unlinkClient.getAddress();
  log("Subscriber dedicated account ready", {
    unlinkAddress,
    durationMs: Date.now() - registerStartedAt,
  });

  const depositPeriods = Number(Bun.env.SUBSCRIBE_DEPOSIT_PERIODS ?? "2");
  if (!Number.isInteger(depositPeriods) || depositPeriods <= 0) {
    throw new Error("SUBSCRIBE_DEPOSIT_PERIODS must be a positive integer.");
  }
  const depositAmount = (BigInt(plan.amount) * BigInt(depositPeriods)).toString();
  log("Preparing funding", {
    depositPeriods,
    depositAmount,
    depositAmountFormatted: formatUsdc(depositAmount),
  });

  log("Checking ERC20 approval", {
    token: USDC_ADDRESS,
    amount: depositAmount,
  });
  const approvalStartedAt = Date.now();
  const approval = await unlinkClient.ensureErc20Approval({
    token: USDC_ADDRESS,
    amount: depositAmount,
  });
  log("Approval check completed", {
    status: approval.status,
    durationMs: Date.now() - approvalStartedAt,
  });

  if (approval.status === "submitted") {
    log("Approval transaction submitted, waiting for receipt", {
      txHash: approval.txHash,
    });
    const approvalReceiptStartedAt = Date.now();
    await publicClient.waitForTransactionReceipt({
      hash: approval.txHash as Hex,
    });
    log("Approval transaction confirmed", {
      txHash: approval.txHash,
      durationMs: Date.now() - approvalReceiptStartedAt,
    });
  } else {
    log("Approval already satisfied");
  }

  log("Depositing funds into dedicated account", {
    amount: depositAmount,
  });
  const depositStartedAt = Date.now();
  const deposit = await unlinkClient.deposit({
    token: USDC_ADDRESS,
    amount: depositAmount,
  });
  log("Deposit submitted", {
    txId: deposit.txId,
    durationMs: Date.now() - depositStartedAt,
  });

  log("Waiting for private balance to reflect deposit", {
    txId: deposit.txId,
    minAmount: depositAmount,
    pollIntervalMs,
    pollTimeoutMs,
  });
  const balanceWaitStartedAt = Date.now();
  try {
    await waitForPrivateBalanceAtLeast({
      client: unlinkClient,
      label: "Subscriber dedicated account",
      token: USDC_ADDRESS,
      minAmount: BigInt(depositAmount),
      intervalMs: pollIntervalMs,
      timeoutMs: pollTimeoutMs,
      onPoll(current) {
        log("Observed private balance while waiting", {
          current: current.toString(),
          minAmount: depositAmount,
          waitedMs: Date.now() - balanceWaitStartedAt,
        });
      },
    });
  } catch (error) {
    log("Private balance wait failed", {
      txId: deposit.txId,
      durationMs: Date.now() - balanceWaitStartedAt,
      error: getErrorMessage(error),
    });
    throw error;
  }
  log("Private balance is ready", {
    txId: deposit.txId,
    unlinkAddress,
    minAmount: depositAmount,
    durationMs: Date.now() - balanceWaitStartedAt,
  });

  log("Collecting dedicated account keys");
  const accountKeys = await dedicatedAccount.getAccountKeys();
  const accountKeysJson = serializeAccountKeys(accountKeys);
  const authKeyId = authAccount.address.toLowerCase();
  log("Signing subscribe proof", {
    authKeyId,
  });
  const authProof = await authAccount.signMessage({
    message: buildSubscribeProofMessage(planId, unlinkAddress, authKeyId),
  });

  log("Submitting subscription to backend", {
    planId,
    unlinkAddress,
  });
  const stopSubscribeHeartbeat = startHeartbeat({
    log,
    message: "Still waiting for backend subscribe response",
    details: {
      planId,
      unlinkAddress,
    },
    intervalMs: heartbeatIntervalMs,
  });
  const subscribeStartedAt = Date.now();
  const subscribeResponse = await (async () => {
    try {
      return await requestJson<
        SubscribeResponse | { error: string; details?: unknown }
      >({
        method: "POST",
        path: "/subscribe",
        body: {
          planId,
          unlinkAddress,
          accountKeysJson,
          authKeyId,
          authPublicKey: authAccount.publicKey,
          authProof,
        },
        });
    } catch (error) {
      log("Backend subscribe request failed", {
        planId,
        unlinkAddress,
        durationMs: Date.now() - subscribeStartedAt,
        error: getErrorMessage(error),
      });
      throw error;
    } finally {
      stopSubscribeHeartbeat();
    }
  })();

  if (subscribeResponse.status !== 201) {
    throw new Error(
      `Subscribe failed (status=${subscribeResponse.status}): ${JSON.stringify(subscribeResponse.body)}`,
    );
  }

  const result = subscribeResponse.body as SubscribeResponse;
  log("Subscription created", {
    subscriptionId: result.subscriptionId,
    firstChargeStatus: result.firstCharge.status,
    firstChargeTxId: result.firstCharge.txId,
    durationMs: Date.now() - subscribeStartedAt,
  });

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      amountFormatted: formatUsdc(plan.amount),
      intervalSeconds: plan.intervalSeconds,
    },
    funding: {
      depositPeriods,
      depositAmount,
      depositAmountFormatted: formatUsdc(depositAmount),
    },
    subscriber: {
      evmAddress: aliceAccount.address,
      authKeyId,
      dedicatedUnlinkAddress: unlinkAddress,
      derivationIndex,
    },
    subscription: result,
  };
}

if (import.meta.main) {
  const { createConsoleLogger } = await import("./lib/progress");
  const result = await subscribeToPlan(undefined, {
    log: createConsoleLogger("subscribe"),
  });
  console.log(JSON.stringify(result, null, 2));
}
