import { unlinkAccount, type UnlinkClient } from "@unlink-xyz/sdk";
import {
  formatUnits,
  hexToBytes,
  keccak256,
  type Hex,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";

const USDC_DECIMALS = 6;

export function getRequiredEnv(name: string): string {
  const value = Bun.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalPositiveIntegerEnv(name: string): number | undefined {
  const value = Bun.env[name]?.trim();
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function normalizePrivateKey(value: string, envName: string): Hex {
  const normalized = value.startsWith("0x")
    ? (value as `0x${string}`)
    : (`0x${value}` as `0x${string}`);

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      `${envName} must be a 32-byte hex private key (with or without 0x prefix).`,
    );
  }

  return normalized as Hex;
}

export function findTokenBalance(
  balances: Array<{ token: string; amount: string }>,
  token: string,
): string {
  const match = balances.find(
    (balance) => balance.token.toLowerCase() === token.toLowerCase(),
  );
  return match?.amount ?? "0";
}

export function formatUsdc(amount: string): string {
  return formatUnits(BigInt(amount), USDC_DECIMALS);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPrivateTokenBalance(
  client: UnlinkClient,
  token: string,
): Promise<bigint> {
  const { balances } = await client.getBalances({ token });
  return BigInt(findTokenBalance(balances, token));
}

export async function waitForPrivateBalanceAtLeast(params: {
  client: UnlinkClient;
  label: string;
  token: string;
  minAmount: bigint;
  intervalMs?: number;
  timeoutMs?: number;
  onPoll?: (current: bigint) => void;
}): Promise<bigint> {
  const intervalMs = params.intervalMs ?? 3_000;
  const timeoutMs = params.timeoutMs ?? 180_000;
  const deadline = Date.now() + timeoutMs;

  let current = await getPrivateTokenBalance(params.client, params.token);
  params.onPoll?.(current);

  while (current < params.minAmount) {
    if (Date.now() >= deadline) {
      throw new Error(
        `${params.label} private balance did not reach ${params.minAmount.toString()} within ${timeoutMs}ms (current=${current.toString()}).`,
      );
    }
    await sleep(intervalMs);
    current = await getPrivateTokenBalance(params.client, params.token);
    params.onPoll?.(current);
  }

  return current;
}

export async function deriveUnlinkAccountFromEvmKey(params: {
  walletClient: {
    signMessage(args: {
      account: PrivateKeyAccount;
      message: string;
    }): Promise<Hex>;
  };
  evmAccount: PrivateKeyAccount;
  index?: number;
}) {
  // Creator/operator account derivation helper for stable role-based accounts.
  // Subscription-dedicated derivation uses a separate flow in ops/subscribe.ts.
  const index = params.index ?? 0;
  const signature = await params.walletClient.signMessage({
    account: params.evmAccount,
    message: `sublink-account:${index}`,
  });
  const seedHex = keccak256(signature);
  return unlinkAccount.fromSeed({
    seed: hexToBytes(seedHex),
    accountIndex: index,
  });
}
