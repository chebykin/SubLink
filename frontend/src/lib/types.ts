export type Mode = "creator" | "subscriber";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "cancelled_by_failure"
  | "completed";

export type ChargeStatus = "pending" | "success" | "failed";

export interface Creator {
  id: string;
  evmAddress: string;
  unlinkAddress: string;
  name: string;
  webhookUrl: string | null;
  createdAt: string;
}

export interface CreatorWithKey extends Creator {
  apiKey: string;
}

export interface Plan {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
  active: boolean;
  createdAt: string;
}

export interface PlanWithCreator extends Plan {
  creator: Creator;
}

export interface Subscription {
  id: string;
  planId: string;
  authKeyId: string;
  authPublicKey: string;
  unlinkAddress: string;
  status: SubscriptionStatus;
  totalSpent: string;
  chargeCount: number;
  consecutiveFailures: number;
  lastChargedAt: string | null;
  nextChargeAt: string;
  createdAt: string;
  cancelledAt: string | null;
  plan?: Plan;
  creator?: Creator;
}

export interface Charge {
  id: string;
  subscriptionId: string;
  amount: string;
  status: ChargeStatus;
  unlinkTxId: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface VerifyResponse {
  valid: boolean;
  subscriptionId?: string;
  planId?: string;
  error?: string;
  sublink?: {
    planId: string;
    plan: { name: string; amount: string; intervalSeconds: number };
    sublinkApiUrl: string;
  };
}
