import {
  getAddress,
  hexToBytes,
  keccak256,
  recoverMessageAddress,
} from "viem";

import {
  AUTH_BEARER_PREFIX,
  AUTH_PROOF_PREFIX,
  BEARER_TOKEN_CLOCK_SKEW_SECONDS,
  BEARER_TOKEN_MAX_AGE_SECONDS,
} from "../config";
import { HttpError } from "../http";
import type { BearerTokenPayload } from "../types";

function normalizeAuthKeyId(value: string): string {
  return getAddress(value).toLowerCase();
}

function isUncompressedPublicKey(value: string): value is `0x${string}` {
  return /^0x04[0-9a-fA-F]{128}$/.test(value);
}

export function getAuthKeyIdFromPublicKey(authPublicKey: `0x${string}`): string {
  if (!isUncompressedPublicKey(authPublicKey)) {
    throw new Error("authPublicKey must be an uncompressed secp256k1 public key.");
  }

  const publicKeyBytes = hexToBytes(authPublicKey);
  if (publicKeyBytes[0] !== 0x04) {
    throw new Error("authPublicKey must start with uncompressed 0x04 prefix.");
  }

  const publicKeyHash = keccak256(publicKeyBytes.slice(1));
  return normalizeAuthKeyId(`0x${publicKeyHash.slice(-40)}`);
}

export function buildSubscribeProofMessage(
  planId: string,
  unlinkAddress: string,
  authKeyId: string,
): string {
  return `${AUTH_PROOF_PREFIX}:${planId}:${unlinkAddress}:${normalizeAuthKeyId(authKeyId)}`;
}

export async function verifySubscribeProof(params: {
  planId: string;
  unlinkAddress: string;
  authKeyId: string;
  authPublicKey: `0x${string}`;
  authProof: `0x${string}`;
}): Promise<string> {
  const normalizedAuthKeyId = normalizeAuthKeyId(params.authKeyId);
  const derivedAuthKeyId = getAuthKeyIdFromPublicKey(params.authPublicKey);

  if (derivedAuthKeyId !== normalizedAuthKeyId) {
    throw new Error("authPublicKey does not match authKeyId.");
  }

  const recoveredAuthKeyId = normalizeAuthKeyId(
    await recoverMessageAddress({
      message: buildSubscribeProofMessage(
        params.planId,
        params.unlinkAddress,
        normalizedAuthKeyId,
      ),
      signature: params.authProof,
    }),
  );

  if (recoveredAuthKeyId !== normalizedAuthKeyId) {
    throw new Error("authProof signature does not match authKeyId.");
  }

  return normalizedAuthKeyId;
}

export function buildBearerMessage(
  subscriptionId: string,
  expiry: number,
): string {
  return `${AUTH_BEARER_PREFIX}:${subscriptionId}:${expiry}`;
}

export function formatBearerToken(payload: BearerTokenPayload): string {
  return `${payload.subscriptionId}.${payload.expiry}.${payload.signature}`;
}

export function parseBearerToken(rawToken: string): BearerTokenPayload {
  const token = rawToken.trim();
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Bearer token must have format subscriptionId.expiry.signature.");
  }

  const [subscriptionId, expiryRaw, signatureRaw] = parts;

  if (!subscriptionId || !expiryRaw || !signatureRaw) {
    throw new Error("Bearer token subscriptionId is empty.");
  }

  const expiry = Number(expiryRaw);
  if (!Number.isInteger(expiry) || expiry <= 0) {
    throw new Error("Bearer token expiry must be a positive integer timestamp.");
  }

  if (!/^0x[0-9a-fA-F]{128}$|^0x[0-9a-fA-F]{130}$/.test(signatureRaw)) {
    throw new Error(
      "Bearer token signature must be a compact or full hex signature.",
    );
  }

  return {
    subscriptionId,
    expiry,
    signature: signatureRaw as `0x${string}`,
  };
}

export interface VerifiedBearerToken {
  payload: BearerTokenPayload;
  authKeyId: string;
}

export async function verifyBearerToken(
  rawToken: string,
): Promise<VerifiedBearerToken> {
  const payload = parseBearerToken(rawToken);
  const now = Math.floor(Date.now() / 1_000);

  if (payload.expiry + BEARER_TOKEN_CLOCK_SKEW_SECONDS < now) {
    throw new Error("Bearer token expired.");
  }

  if (
    payload.expiry >
    now + BEARER_TOKEN_MAX_AGE_SECONDS + BEARER_TOKEN_CLOCK_SKEW_SECONDS
  ) {
    throw new Error("Bearer token expiry exceeds max allowed age.");
  }

  const authKeyId = normalizeAuthKeyId(
    await recoverMessageAddress({
      message: buildBearerMessage(payload.subscriptionId, payload.expiry),
      signature: payload.signature,
    }),
  );

  return {
    payload,
    authKeyId,
  };
}

export async function requireSubscriberAuth(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing bearer token.");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpError(401, "Missing bearer token.");
  }

  try {
    const verified = await verifyBearerToken(token);
    return verified.authKeyId;
  } catch {
    throw new HttpError(401, "Invalid or expired bearer token.");
  }
}
