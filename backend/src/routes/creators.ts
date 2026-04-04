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

interface CreateCreatorBody {
  evmAddress?: unknown;
  unlinkAddress?: unknown;
  name?: unknown;
  webhookUrl?: unknown;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

export async function handleCreateCreator(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<CreateCreatorBody>(request);

    const evmAddressRaw = requireString(body.evmAddress, "evmAddress");
    const unlinkAddress = requireString(body.unlinkAddress, "unlinkAddress");
    const name = requireString(body.name, "name");
    const webhookUrl =
      body.webhookUrl === undefined || body.webhookUrl === null
        ? undefined
        : requireString(body.webhookUrl, "webhookUrl", { allowEmpty: true });

    if (!isAddress(evmAddressRaw)) {
      throw new HttpError(400, "evmAddress must be a valid 0x address.");
    }

    const evmAddress = normalizeAddress(evmAddressRaw);

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

export function handleGetCreator(id: string): Response {
  const creator = getCreatorById(id);
  if (!creator) {
    return errorResponse(404, "Creator not found.");
  }
  return jsonResponse(toPublicCreator(creator));
}
