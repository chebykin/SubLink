import { keccak256 } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import {
  AUTH_DOMAIN,
  AUTH_BEARER_PREFIX,
  BEARER_TOKEN_LIFETIME_SECONDS,
} from "./constants";

export interface AuthState {
  authAccount: PrivateKeyAccount;
  authKeyId: string;
}

export async function deriveAuthKey(
  signMessage: (message: string) => Promise<`0x${string}`>,
): Promise<AuthState> {
  const signature = await signMessage(AUTH_DOMAIN);
  const authSeed = keccak256(signature);
  const authAccount = privateKeyToAccount(authSeed);
  return {
    authAccount,
    authKeyId: authAccount.address.toLowerCase(),
  };
}

export async function createBearerToken(
  authAccount: PrivateKeyAccount,
  subscriptionId: string,
  lifetimeSeconds = BEARER_TOKEN_LIFETIME_SECONDS,
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  const message = `${AUTH_BEARER_PREFIX}:${subscriptionId}:${expiry}`;
  const signature = await authAccount.signMessage({ message });
  return `${subscriptionId}.${expiry}.${signature}`;
}

export async function createListToken(
  authAccount: PrivateKeyAccount,
): Promise<string> {
  return createBearerToken(authAccount, "list");
}
