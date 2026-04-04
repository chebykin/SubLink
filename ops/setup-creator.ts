import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createUnlink, unlinkEvm } from "@unlink-xyz/sdk";

import { createCreatorProof } from "./lib/creator-auth";
import { requestJson } from "./lib/backend-api";
import {
  getErrorMessage,
  noopProgressLogger,
  type ProgressLogger,
} from "./lib/progress";
import {
  deriveUnlinkAccountFromEvmKey,
  getRequiredEnv,
  normalizePrivateKey,
} from "./lib/unlink-helpers";

interface CreatorCreateResponse {
  id: string;
  apiKey: string;
}

interface PlanResponse {
  id: string;
  creatorId: string;
  name: string;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
}

export async function setupCreator(params?: {
  log?: ProgressLogger;
}) {
  const log = params?.log ?? noopProgressLogger;
  const unlinkApiKey = getRequiredEnv("UNLINK_API_KEY");
  const unlinkApiEndpoint = getRequiredEnv("UNLINK_API_ENDPOINT");

  const bobPrivateKey = normalizePrivateKey(getRequiredEnv("BOB"), "BOB");
  const bobAccount = privateKeyToAccount(bobPrivateKey);

  const walletClient = createWalletClient({
    account: bobAccount,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  log("Deriving creator Unlink account", {
    walletAddress: bobAccount.address,
  });
  const unlinkAccount = await deriveUnlinkAccountFromEvmKey({
    walletClient,
    evmAccount: bobAccount,
    index: 0,
  });

  const unlinkClient = createUnlink({
    engineUrl: unlinkApiEndpoint,
    apiKey: unlinkApiKey,
    account: unlinkAccount,
    evm: unlinkEvm.fromViem({
      walletClient,
      publicClient,
    }),
  });

  log("Ensuring creator Unlink account is registered");
  const registerStartedAt = Date.now();
  try {
    await unlinkClient.ensureRegistered();
  } catch (error) {
    log("Creator Unlink account registration failed", {
      durationMs: Date.now() - registerStartedAt,
      error: getErrorMessage(error),
    });
    throw error;
  }
  const unlinkAddress = await unlinkClient.getAddress();
  log("Creator Unlink account ready", {
    unlinkAddress,
    durationMs: Date.now() - registerStartedAt,
  });

  const creatorName = Bun.env.CREATOR_NAME?.trim() || "Creator BOB";
  const planName = Bun.env.PLAN_NAME?.trim() || "Pro";
  const amount = Bun.env.PLAN_AMOUNT?.trim() || "1000";
  const intervalSeconds = Number(Bun.env.PLAN_INTERVAL_SECONDS ?? "2592000");
  const spendingCap = Bun.env.PLAN_SPENDING_CAP?.trim() || "0";
  const description =
    Bun.env.PLAN_DESCRIPTION?.trim() ||
    "Monthly private subscription charged through Unlink.";

  log("Creating creator in backend", {
    creatorName,
    unlinkAddress,
  });
  const createCreatorStartedAt = Date.now();
  const proof = await createCreatorProof({
    walletClient,
    evmAccount: bobAccount,
  });
  const creatorResponse = await requestJson<
    CreatorCreateResponse | { error: string; details?: unknown }
  >({
    method: "POST",
    path: "/creators",
    body: {
      unlinkAddress,
      name: creatorName,
      proof,
    },
  });

  if (creatorResponse.status !== 201) {
    throw new Error(
      `Failed to create creator (status=${creatorResponse.status}): ${JSON.stringify(creatorResponse.body)}`,
    );
  }

  const creator = creatorResponse.body as CreatorCreateResponse;
  log("Creator created", {
    creatorId: creator.id,
    durationMs: Date.now() - createCreatorStartedAt,
  });

  log("Creating plan in backend", {
    planName,
    amount,
    intervalSeconds,
    spendingCap,
  });
  const createPlanStartedAt = Date.now();
  const planResponse = await requestJson<PlanResponse | { error: string }>({
    method: "POST",
    path: "/plans",
    body: {
      creatorId: creator.id,
      name: planName,
      amount,
      intervalSeconds,
      description,
      spendingCap,
    },
  });

  if (planResponse.status !== 201) {
    throw new Error(
      `Failed to create plan (status=${planResponse.status}): ${JSON.stringify(planResponse.body)}`,
    );
  }

  const plan = planResponse.body as PlanResponse;
  log("Plan created", {
    planId: plan.id,
    creatorId: plan.creatorId,
    durationMs: Date.now() - createPlanStartedAt,
  });

  return {
    creator: {
      id: creator.id,
      apiKey: creator.apiKey,
      evmAddress: bobAccount.address,
      unlinkAddress,
      name: creatorName,
    },
    plan,
  };
}

if (import.meta.main) {
  const { createConsoleLogger } = await import("./lib/progress");
  const result = await setupCreator({
    log: createConsoleLogger("setup-creator"),
  });
  console.log(JSON.stringify(result, null, 2));
}
