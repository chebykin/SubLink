import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { buildBearerMessage, deriveAuthAccount } from "./lib/auth-key";
import {
  noopProgressLogger,
  type ProgressLogger,
} from "./lib/progress";
import { getRequiredEnv, normalizePrivateKey } from "./lib/unlink-helpers";

export async function createBearerToken(
  subscriptionIdParam?: string,
  params?: {
    log?: ProgressLogger;
  },
) {
  const log = params?.log ?? noopProgressLogger;
  const alicePrivateKey = normalizePrivateKey(getRequiredEnv("ALICE"), "ALICE");
  const aliceAccount = privateKeyToAccount(alicePrivateKey);

  const walletClient = createWalletClient({
    account: aliceAccount,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });
  const authAccount = await deriveAuthAccount({
    walletClient,
    evmAccount: aliceAccount,
  });

  const subscriptionId = subscriptionIdParam ?? getRequiredEnv("SUBSCRIPTION_ID");
  const expiry = Number(Bun.env.BEARER_EXPIRY ?? Math.floor(Date.now() / 1000) + 600);

  if (!Number.isInteger(expiry) || expiry <= 0) {
    throw new Error("BEARER_EXPIRY must be a positive unix timestamp.");
  }

  log("Signing bearer token", {
    subscriptionId,
    expiry,
    authKeyId: authAccount.address.toLowerCase(),
  });
  const signStartedAt = Date.now();
  const signature = await authAccount.signMessage({
    message: buildBearerMessage(subscriptionId, expiry),
  });

  log("Bearer token created", {
    subscriptionId,
    expiry,
    durationMs: Date.now() - signStartedAt,
  });
  return {
    token: `${subscriptionId}.${expiry}.${signature}`,
    subscriptionId,
    expiry,
    signer: authAccount.address.toLowerCase(),
    walletAddress: aliceAccount.address,
  };
}

if (import.meta.main) {
  const { createConsoleLogger } = await import("./lib/progress");
  const result = await createBearerToken(undefined, {
    log: createConsoleLogger("create-bearer-token"),
  });
  console.log(JSON.stringify(result, null, 2));
}
