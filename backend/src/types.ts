export type SubscriptionStatus =
  | "pending_activation"
  | "active"
  | "past_due"
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
  apiKey: string;
  createdAt: string;
}

export interface CreatorPublic {
  id: string;
  evmAddress: string;
  unlinkAddress: string;
  name: string;
  webhookUrl: string | null;
  createdAt: string;
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
  authKeyId: string;
  authPublicKey: `0x${string}`;
  unlinkAddress: string;
  // Stored as plaintext JSON for MVP; field name preserved for future encryption.
  accountKeysEncrypted: string;
  status: SubscriptionStatus;
  totalSpent: string;
  chargeCount: number;
  consecutiveFailures: number;
  lastChargedAt: string | null;
  paidThroughAt: string | null;
  nextChargeAt: string;
  createdAt: string;
  cancelledAt: string | null;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
  creator: Creator;
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

export interface SerializedAccountKeys {
  spendingPrivateKey: string;
  spendingPublicKey: [string, string];
  viewingPrivateKey: string;
  viewingPublicKey: string;
  nullifyingKey: string;
  masterPublicKey: string;
  address: string;
}

export interface BearerTokenPayload {
  subscriptionId: string;
  expiry: number;
  signature: `0x${string}`;
}

export interface VerifyAccessSuccess {
  valid: true;
  subscriptionId: string;
  planId: string;
}

export interface VerifyAccessDenied {
  valid: false;
  error: string;
  sublink?: {
    planId: string;
    plan: {
      name: string;
      amount: string;
      intervalSeconds: number;
    };
    sublinkApiUrl: string;
  };
}
