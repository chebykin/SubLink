import { isAddress } from "viem";

import {
  createCreator,
  getCreatorById,
  getCreatorByEvmAddress,
  toPublicCreator,
} from "../db/creators";
import {
  HttpError,
  errorResponse,
  jsonResponse,
  normalizeAddress,
  nowIso,
  randomHex,
  readJsonBody,
  requireString,
} from "../http";
import { logInfo } from "../log";
import type { CreatorAuthProof } from "../services/creator-auth";
import { verifyCreatorAuthProof } from "../services/creator-auth";

interface CreateCreatorBody {
  unlinkAddress?: unknown;
  name?: unknown;
  webhookUrl?: unknown;
  proof?: unknown;
}

interface RevealCreatorBody {
  proof?: unknown;
}

interface CreatorAuthProofBody {
  message?: unknown;
  signature?: unknown;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

function requireCreatorAuthProof(input: unknown): CreatorAuthProof {
  if (!input || typeof input !== "object") {
    throw new HttpError(400, "Field 'proof' must be an object.");
  }

  const proof = input as CreatorAuthProofBody;
  return {
    message: requireString(proof.message, "proof.message"),
    signature: requireString(proof.signature, "proof.signature") as `0x${string}`,
  };
}

export async function handleCreateCreator(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<CreateCreatorBody>(request);

    const unlinkAddress = requireString(body.unlinkAddress, "unlinkAddress");
    const name = requireString(body.name, "name");
    const webhookUrl =
      body.webhookUrl === undefined || body.webhookUrl === null
        ? undefined
        : requireString(body.webhookUrl, "webhookUrl", { allowEmpty: true });
    const proof = requireCreatorAuthProof(body.proof);

    let evmAddress: string;
    try {
      evmAddress = await verifyCreatorAuthProof(proof);
    } catch (error) {
      throw new HttpError(
        401,
        error instanceof Error ? error.message : "Invalid creator auth proof.",
      );
    }

    const existing = getCreatorByEvmAddress(evmAddress);
    if (existing) {
      return errorResponse(409, "Creator already exists for this evmAddress.");
    }

    const creator = createCreator({
      id: crypto.randomUUID(),
      evmAddress,
      unlinkAddress,
      name,
      webhookUrl,
      apiKey: randomHex(16),
      createdAt: nowIso(),
    });

    logInfo("creator.created", {
      creatorId: creator.id,
      evmAddress: creator.evmAddress,
      unlinkAddress: creator.unlinkAddress,
      name: creator.name,
    });

    return jsonResponse({ id: creator.id, apiKey: creator.apiKey }, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    if (isUniqueConstraintError(error)) {
      return errorResponse(409, "Creator already exists.");
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to create creator.",
    );
  }
}

export async function handleRevealCreator(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<RevealCreatorBody>(request);
    const proof = requireCreatorAuthProof(body.proof);

    let evmAddress: string;
    try {
      evmAddress = await verifyCreatorAuthProof(proof);
    } catch (error) {
      throw new HttpError(
        401,
        error instanceof Error ? error.message : "Invalid creator auth proof.",
      );
    }

    const creator = getCreatorByEvmAddress(evmAddress);
    if (!creator) {
      return errorResponse(404, "Creator not found.");
    }

    return jsonResponse(creator);
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to reveal creator.",
    );
  }
}

export function handleGetCreator(id: string): Response {
  const creator = getCreatorById(id);
  if (!creator) {
    return errorResponse(404, "Creator not found.");
  }
  return jsonResponse(toPublicCreator(creator));
}

export function handleGetCreatorByEvmAddress(evmAddress: string): Response {
  if (!isAddress(evmAddress)) {
    return errorResponse(400, "evmAddress must be a valid 0x address.");
  }
  const normalized = normalizeAddress(evmAddress);
  const creator = getCreatorByEvmAddress(normalized);
  if (!creator) {
    return errorResponse(404, "Creator not found.");
  }
  return jsonResponse(toPublicCreator(creator));
}
