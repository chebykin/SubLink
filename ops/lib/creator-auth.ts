import type { Hex } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";

const CREATOR_AUTH_PREFIX = "sublink-creator-v1";

export interface CreatorAuthProof {
  message: string;
  signature: Hex;
}

export function buildCreatorAuthMessage(timestamp: string): string {
  return `${CREATOR_AUTH_PREFIX}:${timestamp}`;
}

export async function createCreatorProof(params: {
  walletClient: {
    signMessage(args: {
      account: PrivateKeyAccount;
      message: string;
    }): Promise<Hex>;
  };
  evmAccount: PrivateKeyAccount;
}): Promise<CreatorAuthProof> {
  const message = buildCreatorAuthMessage(new Date().toISOString());
  const signature = await params.walletClient.signMessage({
    account: params.evmAccount,
    message,
  });

  return { message, signature };
}
