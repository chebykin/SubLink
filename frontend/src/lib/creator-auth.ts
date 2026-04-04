export interface CreatorAuthProof {
  message: string;
  signature: `0x${string}`;
}

const CREATOR_AUTH_PREFIX = "sublink-creator-v1";

export function buildCreatorAuthMessage(timestamp: string): string {
  return `${CREATOR_AUTH_PREFIX}:${timestamp}`;
}

export async function createCreatorProof(
  signMessage: (message: string) => Promise<`0x${string}`>,
): Promise<CreatorAuthProof> {
  const message = buildCreatorAuthMessage(new Date().toISOString());
  const signature = await signMessage(message);
  return { message, signature };
}
