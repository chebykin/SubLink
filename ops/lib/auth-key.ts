import { keccak256, type Hex } from "viem";
import {
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";

const AUTH_DOMAIN = "sublink-auth-v1";
const AUTH_PROOF_PREFIX = "sublink-subscribe-v1";
const AUTH_BEARER_PREFIX = "sublink-bearer-v1";

export async function deriveAuthAccount(params: {
  walletClient: {
    signMessage(args: {
      account: PrivateKeyAccount;
      message: string;
    }): Promise<Hex>;
  };
  evmAccount: PrivateKeyAccount;
}): Promise<PrivateKeyAccount> {
  const signature = await params.walletClient.signMessage({
    account: params.evmAccount,
    message: AUTH_DOMAIN,
  });

  const authSeed = keccak256(signature);
  return privateKeyToAccount(authSeed);
}

export function buildSubscribeProofMessage(
  planId: string,
  unlinkAddress: string,
  authKeyId: string,
): string {
  return `${AUTH_PROOF_PREFIX}:${planId}:${unlinkAddress}:${authKeyId.toLowerCase()}`;
}

export function buildBearerMessage(
  subscriptionId: string,
  expiry: number,
): string {
  return `${AUTH_BEARER_PREFIX}:${subscriptionId}:${expiry}`;
}
