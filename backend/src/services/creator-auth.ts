import { getAddress, recoverMessageAddress, type Hex } from "viem";

import {
  CREATOR_AUTH_CLOCK_SKEW_SECONDS,
  CREATOR_AUTH_PREFIX,
} from "../config";
import { normalizeAddress } from "../http";

export interface CreatorAuthProof {
  message: string;
  signature: Hex;
}

export function buildCreatorAuthMessage(timestamp: string): string {
  return `${CREATOR_AUTH_PREFIX}:${timestamp}`;
}

function parseCreatorAuthTimestamp(message: string): string {
  const prefix = `${CREATOR_AUTH_PREFIX}:`;
  if (!message.startsWith(prefix)) {
    throw new Error("Creator auth message has an invalid prefix.");
  }

  const timestamp = message.slice(prefix.length);
  if (!timestamp) {
    throw new Error("Creator auth message is missing a timestamp.");
  }

  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) {
    throw new Error("Creator auth timestamp must be a valid ISO-8601 string.");
  }

  return timestamp;
}

export async function verifyCreatorAuthProof(
  proof: CreatorAuthProof,
  options?: { nowMs?: number; maxSkewMs?: number },
): Promise<string> {
  const timestamp = parseCreatorAuthTimestamp(proof.message);
  const timestampMs = Date.parse(timestamp);
  const nowMs = options?.nowMs ?? Date.now();
  const maxSkewMs =
    options?.maxSkewMs ?? CREATOR_AUTH_CLOCK_SKEW_SECONDS * 1_000;

  if (Math.abs(nowMs - timestampMs) > maxSkewMs) {
    throw new Error("Creator auth proof timestamp is outside the allowed skew.");
  }

  const recoveredAddress = await recoverMessageAddress({
    message: proof.message,
    signature: proof.signature,
  });

  return normalizeAddress(getAddress(recoveredAddress));
}
