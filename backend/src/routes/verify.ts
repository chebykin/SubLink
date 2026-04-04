import { getPlanWithCreatorById } from "../db/plans";
import { getCreatorById } from "../db/creators";
import { getSubscriptionWithPlanById } from "../db/subscriptions";
import { SUBLINK_API_URL } from "../config";
import { errorResponse, jsonResponse } from "../http";
import { verifyBearerToken } from "../services/bearer-token";
import type { VerifyAccessDenied } from "../types";

function discoveryResponse(params: {
  planId: string;
  planName: string;
  amount: string;
  intervalSeconds: number;
}): Response {
  const payload: VerifyAccessDenied = {
    valid: false,
    error: "Subscription required",
    sublink: {
      planId: params.planId,
      plan: {
        name: params.planName,
        amount: params.amount,
        intervalSeconds: params.intervalSeconds,
      },
      sublinkApiUrl: SUBLINK_API_URL,
    },
  };

  return jsonResponse(payload, 402);
}

export async function handleVerify(planId: string, request: Request): Promise<Response> {
  const plan = getPlanWithCreatorById(planId);
  if (!plan) {
    return errorResponse(404, "Plan not found.");
  }

  const creator = getCreatorById(plan.creator.id);
  if (!creator) {
    return errorResponse(404, "Creator not found.");
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey || apiKey !== creator.apiKey) {
    return errorResponse(401, "Invalid API key.");
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return discoveryResponse({
      planId,
      planName: plan.name,
      amount: plan.amount,
      intervalSeconds: plan.intervalSeconds,
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return discoveryResponse({
      planId,
      planName: plan.name,
      amount: plan.amount,
      intervalSeconds: plan.intervalSeconds,
    });
  }

  try {
    const verified = await verifyBearerToken(token);

    const subscription = getSubscriptionWithPlanById(verified.payload.subscriptionId);
    if (!subscription) {
      return discoveryResponse({
        planId,
        planName: plan.name,
        amount: plan.amount,
        intervalSeconds: plan.intervalSeconds,
      });
    }

    if (
      subscription.status !== "active" ||
      subscription.planId !== planId ||
      subscription.authKeyId !== verified.authKeyId
    ) {
      return discoveryResponse({
        planId,
        planName: plan.name,
        amount: plan.amount,
        intervalSeconds: plan.intervalSeconds,
      });
    }

    return jsonResponse({
      valid: true,
      subscriptionId: subscription.id,
      planId,
    });
  } catch (error) {
    console.error("[verify] token verification failed:", error);
    return discoveryResponse({
      planId,
      planName: plan.name,
      amount: plan.amount,
      intervalSeconds: plan.intervalSeconds,
    });
  }
}
