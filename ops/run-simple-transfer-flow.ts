import { createUnlink, unlinkAccount, unlinkEvm } from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  hexToBytes,
  http,
  keccak256,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const CHAIN_ID = 84532;
const RPC_URL = "https://sepolia.base.org";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_DECIMALS = 6;
const AMOUNT = "500000"; // 0.5 USDC (6 decimals)
const DERIVATION_INDEX = 0;
const PRIVATE_BALANCE_WAIT_INTERVAL_MS = 3_000;
const PRIVATE_BALANCE_WAIT_TIMEOUT_MS = 180_000;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(value: string, envName: string): Hex {
  const normalized = value.startsWith("0x")
    ? value
    : (`0x${value}` as `0x${string}`);

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      `${envName} must be a 32-byte hex private key (with or without 0x prefix).`,
    );
  }

  return normalized;
}

function findTokenBalance(
  balances: Array<{ token: string; amount: string }>,
  token: string,
): string {
  const match = balances.find(
    (balance) => balance.token.toLowerCase() === token.toLowerCase(),
  );
  return match?.amount ?? "0";
}

function formatUsdc(amount: string): string {
  return formatUnits(BigInt(amount), USDC_DECIMALS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getPrivateTokenBalance(params: {
  unlink: ReturnType<typeof createUnlink>;
  token: string;
}): Promise<bigint> {
  const { balances } = await params.unlink.getBalances({ token: params.token });
  return BigInt(findTokenBalance(balances, params.token));
}

async function waitForPrivateBalanceAtLeast(params: {
  unlink: ReturnType<typeof createUnlink>;
  label: string;
  token: string;
  minAmount: bigint;
  intervalMs?: number;
  timeoutMs?: number;
}): Promise<bigint> {
  const intervalMs = params.intervalMs ?? PRIVATE_BALANCE_WAIT_INTERVAL_MS;
  const timeoutMs = params.timeoutMs ?? PRIVATE_BALANCE_WAIT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  let current = await getPrivateTokenBalance({
    unlink: params.unlink,
    token: params.token,
  });

  while (current < params.minAmount) {
    if (Date.now() >= deadline) {
      throw new Error(
        `${params.label} private balance did not reach ${params.minAmount.toString()} within ${timeoutMs}ms (current=${current.toString()}).`,
      );
    }
    await sleep(intervalMs);
    current = await getPrivateTokenBalance({
      unlink: params.unlink,
      token: params.token,
    });
  }

  return current;
}

async function deriveUnlinkAccountFromEvmKey(params: {
  walletClient: ReturnType<typeof createWalletClient>;
  evmAccount: PrivateKeyAccount;
  index: number;
}): Promise<ReturnType<typeof unlinkAccount.fromSeed>> {
  const message = `unlink account seed ${params.index}`;
  const signature = await params.walletClient.signMessage({
    account: params.evmAccount,
    message,
  });
  const seedHex = keccak256(signature);
  return unlinkAccount.fromSeed({ seed: hexToBytes(seedHex) });
}

async function main() {
  const apiKey = getRequiredEnv("UNLINK_API_KEY");
  const engineUrl = getRequiredEnv("UNLINK_API_ENDPOINT");

  const alicePrivateKey = normalizePrivateKey(getRequiredEnv("ALICE"), "ALICE");
  const bobPrivateKey = normalizePrivateKey(getRequiredEnv("BOB"), "BOB");

  const aliceEvmAccount = privateKeyToAccount(alicePrivateKey);
  const bobEvmAccount = privateKeyToAccount(bobPrivateKey);

  const aliceWalletClient = createWalletClient({
    account: aliceEvmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const bobWalletClient = createWalletClient({
    account: bobEvmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const alicePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const bobPublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const [aliceChainId, bobChainId] = await Promise.all([
    alicePublicClient.getChainId(),
    bobPublicClient.getChainId(),
  ]);
  if (aliceChainId !== CHAIN_ID || bobChainId !== CHAIN_ID) {
    throw new Error(
      `Unexpected chain ID(s): Alice=${aliceChainId}, Bob=${bobChainId}. Expected ${CHAIN_ID} (Base Sepolia).`,
    );
  }

  const [aliceUnlinkAccount, bobUnlinkAccount] = await Promise.all([
    deriveUnlinkAccountFromEvmKey({
      walletClient: aliceWalletClient,
      evmAccount: aliceEvmAccount,
      index: DERIVATION_INDEX,
    }),
    deriveUnlinkAccountFromEvmKey({
      walletClient: bobWalletClient,
      evmAccount: bobEvmAccount,
      index: DERIVATION_INDEX,
    }),
  ]);

  const alice = createUnlink({
    engineUrl,
    apiKey,
    account: aliceUnlinkAccount,
    evm: unlinkEvm.fromViem({
      walletClient: aliceWalletClient,
      publicClient: alicePublicClient,
    }),
  });
  const bob = createUnlink({
    engineUrl,
    apiKey,
    account: bobUnlinkAccount,
    evm: unlinkEvm.fromViem({
      walletClient: bobWalletClient,
      publicClient: bobPublicClient,
    }),
  });

  console.log("Starting Unlink private transfer flow");
  console.log(`Engine URL: ${engineUrl}`);
  console.log(`Chain: Base Sepolia (${CHAIN_ID})`);
  console.log(`Token: USDC ${USDC}`);
  console.log(`Amount: ${AMOUNT} (${formatUsdc(AMOUNT)} USDC)`);

  console.log("\n1) Register Alice and Bob");
  await Promise.all([alice.ensureRegistered(), bob.ensureRegistered()]);
  const [aliceUnlinkAddress, bobUnlinkAddress] = await Promise.all([
    alice.getAddress(),
    bob.getAddress(),
  ]);
  console.log(`Alice Unlink address: ${aliceUnlinkAddress}`);
  console.log(`Bob Unlink address:   ${bobUnlinkAddress}`);

  const [aliceInitialPrivateUsdc, bobInitialPrivateUsdc] = await Promise.all([
    getPrivateTokenBalance({ unlink: alice, token: USDC }),
    getPrivateTokenBalance({ unlink: bob, token: USDC }),
  ]);
  console.log(
    `Alice initial private USDC: ${aliceInitialPrivateUsdc.toString()} (${formatUsdc(aliceInitialPrivateUsdc.toString())} USDC)`,
  );
  console.log(
    `Bob initial private USDC:   ${bobInitialPrivateUsdc.toString()} (${formatUsdc(bobInitialPrivateUsdc.toString())} USDC)`,
  );

  console.log("\n2) Alice approval for Permit2 (one-time)");
  const approval = await alice.ensureErc20Approval({
    token: USDC,
    amount: AMOUNT,
  });
  if (approval.status === "submitted") {
    console.log(`Approval tx submitted: ${approval.txHash}`);
    await alicePublicClient.waitForTransactionReceipt({
      hash: approval.txHash as Hex,
    });
    console.log("Approval transaction confirmed");
  } else {
    console.log("Approval already present");
  }

  console.log("\n3) Alice deposits 0.5 USDC");
  const deposit = await alice.deposit({
    token: USDC,
    amount: AMOUNT,
  });
  console.log(`Deposit txId: ${deposit.txId} (initial status: ${deposit.status})`);
  const depositFinal = await alice.pollTransactionStatus(deposit.txId);
  console.log(`Deposit confirmed status: ${depositFinal.status}`);
  if (depositFinal.status === "failed") {
    throw new Error(`Deposit failed (txId=${deposit.txId})`);
  }

  const aliceExpectedAfterDeposit = aliceInitialPrivateUsdc + BigInt(AMOUNT);
  const aliceAfterDeposit = await waitForPrivateBalanceAtLeast({
    unlink: alice,
    label: "Alice",
    token: USDC,
    minAmount: aliceExpectedAfterDeposit,
  });
  console.log(
    `Alice private balance ready for transfer: ${aliceAfterDeposit.toString()} (${formatUsdc(aliceAfterDeposit.toString())} USDC)`,
  );

  console.log("\n4) Alice privately transfers 0.5 USDC to Bob");
  const transfer = await alice.transfer({
    recipientAddress: bobUnlinkAddress,
    token: USDC,
    amount: AMOUNT,
  });
  console.log(
    `Transfer txId: ${transfer.txId} (initial status: ${transfer.status})`,
  );
  const transferFinal = await alice.pollTransactionStatus(transfer.txId);
  console.log(`Transfer confirmed status: ${transferFinal.status}`);
  if (transferFinal.status === "failed") {
    throw new Error(`Transfer failed (txId=${transfer.txId})`);
  }

  const bobExpectedAfterTransfer = bobInitialPrivateUsdc + BigInt(AMOUNT);
  const bobAfterTransfer = await waitForPrivateBalanceAtLeast({
    unlink: bob,
    label: "Bob",
    token: USDC,
    minAmount: bobExpectedAfterTransfer,
  });
  console.log(
    `Bob private balance ready for withdrawal: ${bobAfterTransfer.toString()} (${formatUsdc(bobAfterTransfer.toString())} USDC)`,
  );

  console.log("\n5) Bob withdraws 0.5 USDC to his EVM address");
  const withdrawal = await bob.withdraw({
    recipientEvmAddress: bobEvmAccount.address,
    token: USDC,
    amount: AMOUNT,
  });
  console.log(
    `Withdrawal txId: ${withdrawal.txId} (initial status: ${withdrawal.status})`,
  );
  const withdrawalFinal = await bob.pollTransactionStatus(withdrawal.txId);
  console.log(`Withdrawal confirmed status: ${withdrawalFinal.status}`);
  if (withdrawalFinal.status === "failed") {
    throw new Error(`Withdrawal failed (txId=${withdrawal.txId})`);
  }

  console.log("\n6) Final private balances");
  const [aliceBalances, bobBalances] = await Promise.all([
    alice.getBalances({ token: USDC }),
    bob.getBalances({ token: USDC }),
  ]);
  const alicePrivateUsdc = findTokenBalance(aliceBalances.balances, USDC);
  const bobPrivateUsdc = findTokenBalance(bobBalances.balances, USDC);
  console.log(
    `Alice private USDC: ${alicePrivateUsdc} (${formatUsdc(alicePrivateUsdc)} USDC)`,
  );
  console.log(
    `Bob private USDC:   ${bobPrivateUsdc} (${formatUsdc(bobPrivateUsdc)} USDC)`,
  );
}

await main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nFlow failed:");
  console.error(message);
  process.exit(1);
});
