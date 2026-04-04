import { isAddress } from "viem";

import { getCreatorById } from "../db/creators";
import { getPlanById } from "../db/plans";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionById,
  listSubscriptions,
} from "../db/subscriptions";
import {
  HttpError,
  errorResponse,
  jsonResponse,
  nowIso,
  readJsonBody,
  requireString,
} from "../http";
import { processSubscriptionCharge } from "../services/cron";
import { deserializeAccountKeys } from "../services/account-keys";
import {
  requireSubscriberAuth,
  verifySubscribeProof,
} from "../services/bearer-token";
import type { Subscription } from "../types";

interface SubscribeBody {
  planId?: unknown;
  unlinkAddress?: unknown;
  accountKeysJson?: unknown;
  authKeyId?: unknown;
  authPublicKey?: unknown;
  authProof?: unknown;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("unique constraint failed")
  );
}

type SubscriptionResponse = Omit<Subscription, "accountKeysEncrypted">;

function toSubscriptionResponse(
  subscription: Subscription,
): SubscriptionResponse {
  const { accountKeysEncrypted: _sensitive, ...safe } = subscription;
  return safe;
}

export async function handleSubscribe(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<SubscribeBody>(request);

    const planId = requireString(body.planId, "planId");
    const unlinkAddress = requireString(body.unlinkAddress, "unlinkAddress");
    const accountKeysJson = requireString(body.accountKeysJson, "accountKeysJson");
    const authKeyIdRaw = requireString(body.authKeyId, "authKeyId");
    const authPublicKey = requireString(body.authPublicKey, "authPublicKey") as `0x${string}`;
    const authProof = requireString(body.authProof, "authProof") as `0x${string}`;

    if (!isAddress(authKeyIdRaw)) {
      throw new HttpError(400, "authKeyId must be a valid 0x address.");
    }

    let parsedKeys: ReturnType<typeof deserializeAccountKeys>;
    try {
      parsedKeys = deserializeAccountKeys(accountKeysJson);
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Invalid accountKeysJson payload.",
      );
    }
    if (parsedKeys.address !== unlinkAddress) {
      throw new HttpError(
        400,
        "accountKeysJson address must match unlinkAddress in request.",
      );
    }

    let authKeyId: string;
    try {
      authKeyId = await verifySubscribeProof({
        planId,
        unlinkAddress,
        authKeyId: authKeyIdRaw,
        authPublicKey,
        authProof,
      });
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error ? error.message : "Invalid auth proof.",
      );
    }

    const plan = getPlanById(planId);
    if (!plan || !plan.active) {
      return errorResponse(404, "Active plan not found.");
    }

    const creator = getCreatorById(plan.creatorId);
    if (!creator) {
      return errorResponse(404, "Creator not found for plan.");
    }

    const createdAt = nowIso();
    const initialNextChargeAt = new Date(
      Date.parse(createdAt) + plan.intervalSeconds * 1_000,
    ).toISOString();
    const subscription = createSubscription({
      id: crypto.randomUUID(),
      planId,
      authKeyId,
      authPublicKey,
      unlinkAddress,
      accountKeysEncrypted: accountKeysJson,
      status: "active",
      totalSpent: "0",
      chargeCount: 0,
      consecutiveFailures: 0,
      lastChargedAt: null,
      nextChargeAt: initialNextChargeAt,
      createdAt,
      cancelledAt: null,
    });

    const firstCharge = await processSubscriptionCharge({
      subscription: {
        ...subscription,
        plan,
        creator,
      },
      chargedAt: nowIso(),
    });

    return jsonResponse(
      {
        subscriptionId: subscription.id,
        firstCharge: {
          txId: firstCharge.charge.unlinkTxId,
          status: firstCharge.charge.status,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    if (isUniqueConstraintError(error)) {
      return errorResponse(
        409,
        "Subscription already exists for this auth key and plan.",
      );
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to create subscription.",
    );
  }
}

export async function handleListSubscriptions(request: Request): Promise<Response> {
  try {
    const authKeyId = await requireSubscriberAuth(request);
    const url = new URL(request.url);
    const planId = url.searchParams.get("planId")?.trim() || undefined;
    const creatorId = url.searchParams.get("creatorId")?.trim() || undefined;

    const subscriptions = listSubscriptions({
      authKeyId,
      planId,
      creatorId,
    });

    return jsonResponse({
      subscriptions: subscriptions.map(toSubscriptionResponse),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to list subscriptions.",
    );
  }
}

export async function handleCancelSubscription(
  subscriptionId: string,
  request: Request,
): Promise<Response> {
  try {
    const signerAuthKeyId = await requireSubscriberAuth(request);
    const subscription = getSubscriptionById(subscriptionId);
    if (!subscription) {
      return errorResponse(404, "Subscription not found.");
    }

    if (subscription.authKeyId !== signerAuthKeyId) {
      return errorResponse(403, "Forbidden.");
    }

    if (subscription.status !== "active") {
      return errorResponse(409, "Only active subscriptions can be cancelled.");
    }

    const cancelled = cancelSubscription(subscriptionId, "cancelled", nowIso());
    if (!cancelled) {
      return errorResponse(500, "Failed to cancel subscription.");
    }

    return jsonResponse(toSubscriptionResponse(cancelled));
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to cancel subscription.",
    );
  }
}
