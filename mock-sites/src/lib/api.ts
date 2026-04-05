import { API_URL } from "./constants";
import type {
  PlanDetails,
  SubscribeBody,
  SubscribeResponse,
  Subscription,
  VerifyResponse,
} from "./types";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error || res.statusText,
      body?.details,
    );
  }
  return body as T;
}

export function listSubscriptions(
  token: string,
  planId?: string,
): Promise<{ subscriptions: Subscription[] }> {
  const q = planId ? `?planId=${planId}` : "";
  return request(`/subscriptions${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getPlan(planId: string): Promise<PlanDetails> {
  return request(`/plans/${encodeURIComponent(planId)}`);
}

export function createSubscription(
  body: SubscribeBody,
): Promise<SubscribeResponse> {
  return request(`/subscribe`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verifyAccess(
  planId: string,
  bearerToken: string,
  apiKey: string,
): Promise<VerifyResponse> {
  return request(`/verify/${planId}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "X-Api-Key": apiKey,
    },
  });
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export { ApiError };
