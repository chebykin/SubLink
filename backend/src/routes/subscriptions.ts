import { isAddress } from "viem";

import { getCreatorById } from "../db/creators";
import { getPlanById } from "../db/plans";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionById,
  getSubscriptionByPlanAndAuthKeyId,
  listSubscriptions,
  updateSubscriptionBillingState,
} from "../db/subscriptions";
import {
  HttpError,
  addSecondsToIso,
  errorResponse,
  jsonResponse,
  nowIso,
  readJsonBody,
  requireString,
} from "../http";
import { processSubscriptionCharge } from "../services/cron";
import { SubscriptionInactiveError } from "../services/cron";
import { deserializeAccountKeys } from "../services/account-keys";
import {
  requireSubscriberAuth,
  verifySubscribeProof,
} from "../services/bearer-token";
import { logInfo } from "../log";
import type { Subscription, SubscriptionWithPlan } from "../types";

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

function toSubscriptionWithPlanResponse(sub: SubscriptionWithPlan) {
  const { accountKeysEncrypted: _sensitive, creator, ...safe } = sub;
  const { apiKey: _apiKey, ...creatorPublic } = creator;
  return { ...safe, creator: creatorPublic };
}

async function attemptActivationCharge(params: {
  subscription: SubscriptionWithPlan;
  source: "subscribe_initial" | "subscribe_retry";
}): Promise<Response> {
  const charge = await processSubscriptionCharge({
    subscription: params.subscription,
    chargedAt: nowIso(),
    source: params.source,
    allowedStatuses: ["pending_activation"],
  });

  if (charge.outcome !== "success") {
    return errorResponse(
      402,
      "Initial charge failed. Fund the dedicated account and wait for the next retry.",
      {
        subscriptionId: params.subscription.id,
        firstCharge: {
          txId: charge.charge.unlinkTxId,
          status: charge.charge.status,
          errorMessage: charge.charge.errorMessage,
        },
      },
    );
  }

  return jsonResponse(
    {
      subscriptionId: params.subscription.id,
      firstCharge: {
        txId: charge.charge.unlinkTxId,
        status: charge.charge.status,
      },
    },
    201,
  );
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

    const existing = getSubscriptionByPlanAndAuthKeyId(planId, authKeyId);
    if (existing) {
      if (
        existing.status === "pending_activation" &&
        existing.chargeCount === 0 &&
        existing.paidThroughAt === null
      ) {
        if (
          existing.unlinkAddress !== unlinkAddress ||
          existing.authPublicKey !== authPublicKey
        ) {
          return errorResponse(
            409,
            "Subscription setup is already pending with different activation details.",
          );
        }

        if (creator.unlinkAddress.startsWith("unlink1placeholder-")) {
          const activatedAt = nowIso();
          const paidThroughAt = addSecondsToIso(activatedAt, plan.intervalSeconds);
          const activated = updateSubscriptionBillingState({
            id: existing.id,
            status: "active",
            totalSpent: "0",
            chargeCount: 0,
            consecutiveFailures: 0,
            lastChargedAt: activatedAt,
            paidThroughAt,
            nextChargeAt: paidThroughAt,
            cancelledAt: null,
          });
          logInfo("subscription.activation_simulated", {
            subscriptionId: existing.id,
            reason: "creator_unlink_address_placeholder",
            creatorId: creator.id,
            paidThroughAt,
          });
          return jsonResponse(
            {
              subscriptionId: activated?.id ?? existing.id,
              firstCharge: { txId: null, status: "simulated" },
            },
            201,
          );
        }

        try {
          return await attemptActivationCharge({
            subscription: {
              ...existing,
              plan,
              creator,
            },
            source: "subscribe_retry",
          });
        } catch (error) {
          if (error instanceof SubscriptionInactiveError) {
            return errorResponse(
              409,
              "Subscription activation was already processed. Refresh subscription state.",
            );
          }
          throw error;
        }
      }

      return errorResponse(
        409,
        "Subscription already exists for this auth key and plan.",
      );
    }

    const createdAt = nowIso();
    const subscription = createSubscription({
      id: crypto.randomUUID(),
      planId,
      authKeyId,
      authPublicKey,
      unlinkAddress,
      accountKeysEncrypted: accountKeysJson,
      status: "pending_activation",
      totalSpent: "0",
      chargeCount: 0,
      consecutiveFailures: 0,
      lastChargedAt: null,
      paidThroughAt: null,
      nextChargeAt: createdAt,
      createdAt,
      cancelledAt: null,
    });

    logInfo("subscription.created", {
      subscriptionId: subscription.id,
      planId: subscription.planId,
      authKeyId: subscription.authKeyId,
      creatorId: creator.id,
      unlinkAddress: subscription.unlinkAddress,
      paidThroughAt: subscription.paidThroughAt,
      nextChargeAt: subscription.nextChargeAt,
    });

    if (creator.unlinkAddress.startsWith("unlink1placeholder-")) {
      const activatedAt = nowIso();
      const paidThroughAt = addSecondsToIso(activatedAt, plan.intervalSeconds);
      const activated = updateSubscriptionBillingState({
        id: subscription.id,
        status: "active",
        totalSpent: "0",
        chargeCount: 0,
        consecutiveFailures: 0,
        lastChargedAt: activatedAt,
        paidThroughAt,
        nextChargeAt: paidThroughAt,
        cancelledAt: null,
      });
      logInfo("subscription.activation_simulated", {
        subscriptionId: subscription.id,
        reason: "creator_unlink_address_placeholder",
        creatorId: creator.id,
        paidThroughAt,
      });
      return jsonResponse(
        {
          subscriptionId: activated?.id ?? subscription.id,
          firstCharge: { txId: null, status: "simulated" },
        },
        201,
      );
    }

    return await attemptActivationCharge({
      subscription: {
        ...subscription,
        plan,
        creator,
      },
      source: "subscribe_initial",
    });
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
      subscriptions: subscriptions.map(toSubscriptionWithPlanResponse),
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

    if (
      subscription.status !== "active" &&
      subscription.status !== "past_due" &&
      subscription.status !== "pending_activation"
    ) {
      return errorResponse(
        409,
        "Only chargeable subscriptions can be cancelled.",
      );
    }

    const cancelled = cancelSubscription(subscriptionId, "cancelled", nowIso());
    if (!cancelled) {
      return errorResponse(500, "Failed to cancel subscription.");
    }

    logInfo("subscription.cancelled", {
      subscriptionId: cancelled.id,
      planId: cancelled.planId,
      authKeyId: cancelled.authKeyId,
      cancelledAt: cancelled.cancelledAt,
      reason: "subscriber_request",
    });

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
