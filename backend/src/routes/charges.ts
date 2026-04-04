import { listChargesBySubscriptionId } from "../db/charges";
import { getSubscriptionById } from "../db/subscriptions";
import { HttpError, errorResponse, jsonResponse } from "../http";
import { requireSubscriberAuth } from "../services/bearer-token";
import type { Charge } from "../types";

type ChargeResponse = Omit<Charge, "errorMessage"> & { errorMessage: string | null };

function toChargeResponse(charge: Charge): ChargeResponse {
  if (charge.status !== "failed") {
    return charge;
  }

  return {
    ...charge,
    errorMessage: charge.errorMessage ? "Charge failed." : null,
  };
}

export async function handleGetCharges(
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

    const charges = listChargesBySubscriptionId(subscriptionId);
    return jsonResponse({ charges: charges.map(toChargeResponse) });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message, error.details);
    }

    return errorResponse(
      500,
      error instanceof Error ? error.message : "Failed to list charges.",
    );
  }
}
