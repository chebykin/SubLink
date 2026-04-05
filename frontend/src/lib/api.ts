import { API_URL } from "./constants";
import type { CreatorAuthProof } from "./creator-auth";
import type {
  Creator,
  CreatorWithKey,
  Plan,
  PlanWithCreator,
  Subscription,
  Charge,
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

function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ── Public ───────────────────────────────────────────────

export function getHealth() {
  return request<{ ok: boolean }>("/health");
}

export function getCreator(id: string) {
  return request<Creator>(`/creators/${id}`);
}

export function getCreatorByEvmAddress(evmAddress: string) {
  return request<Creator>(`/creators/by-evm/${evmAddress}`);
}

export function createCreator(body: {
  name: string;
  unlinkAddress: string;
  webhookUrl?: string;
  proof: CreatorAuthProof;
}) {
  return request<{ id: string; apiKey: string }>("/creators", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function revealCreator(proof: CreatorAuthProof) {
  return request<CreatorWithKey>("/creators/reveal", {
    method: "POST",
    body: JSON.stringify({ proof }),
  });
}

export function getPlans(creatorId?: string) {
  const q = creatorId ? `?creatorId=${creatorId}` : "";
  return request<{ plans: Plan[] }>(`/plans${q}`);
}

export function getPlan(id: string) {
  return request<PlanWithCreator>(`/plans/${id}`);
}

export function createPlan(body: {
  creatorId: string;
  name: string;
  amount: string;
  intervalSeconds: number;
  description?: string;
  spendingCap?: string;
}) {
  return request<Plan>("/plans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Subscriber (Bearer token) ────────────────────────────

export function getSubscriptions(
  token: string,
  query?: { planId?: string; creatorId?: string },
) {
  const params = new URLSearchParams();
  if (query?.planId) params.set("planId", query.planId);
  if (query?.creatorId) params.set("creatorId", query.creatorId);
  const q = params.toString() ? `?${params}` : "";
  return request<{ subscriptions: Subscription[] }>(`/subscriptions${q}`, {
    headers: bearerHeaders(token),
  });
}

export function cancelSubscription(id: string, token: string) {
  return request<Subscription>(`/subscriptions/${id}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
}

export function getCharges(subscriptionId: string, token: string) {
  return request<{ charges: Charge[] }>(`/charges/${subscriptionId}`, {
    headers: bearerHeaders(token),
  });
}

// ── Creator (API key) ────────────────────────────────────

export function getCreatorSubscriptions(apiKey: string) {
  return request<{ subscriptions: Subscription[] }>("/creators/subscriptions", {
    headers: { "X-Api-Key": apiKey },
  });
}

// ── Verification ─────────────────────────────────────────

export function verifyAccess(
  planId: string,
  bearerToken: string,
  apiKey: string,
) {
  return request<VerifyResponse>(`/verify/${planId}`, {
    headers: {
      ...bearerHeaders(bearerToken),
      "X-Api-Key": apiKey,
    },
  });
}

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export { ApiError };
