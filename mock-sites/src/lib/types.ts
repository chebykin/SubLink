export type SubscriptionStatus =
  | "pending_activation"
  | "active"
  | "past_due"
  | "cancelled"
  | "cancelled_by_failure"
  | "completed";

export interface Plan {
  name: string;
  amount: string;
  intervalSeconds: number;
}

export interface PlanDetails {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
  active: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    unlinkAddress: string;
    evmAddress: string;
  };
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

export interface SubscribeBody {
  planId: string;
  unlinkAddress: string;
  accountKeysJson: string;
  authKeyId: string;
  authPublicKey: `0x${string}`;
  authProof: `0x${string}`;
}

export interface SubscribeResponse {
  subscriptionId: string;
  firstCharge: {
    txId: string | null;
    status: string;
  };
}
