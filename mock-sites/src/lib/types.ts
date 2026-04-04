export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "cancelled_by_failure"
  | "completed";

export interface Plan {
  name: string;
  amount: string;
  intervalSeconds: number;
}

export interface Subscription {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  totalSpent: string;
  chargeCount: number;
}

export interface VerifyResponse {
  valid: boolean;
  subscriptionId?: string;
  planId?: string;
  error?: string;
  sublink?: {
    planId: string;
    plan: Plan;
    sublinkApiUrl: string;
  };
}
