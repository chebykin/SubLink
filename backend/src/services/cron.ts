import {
  CRON_INTERVAL_MS,
  MAX_CONSECUTIVE_FAILURES,
  USDC_ADDRESS,
} from "../config";
import { createCharge, updateChargeStatus } from "../db/charges";
import {
  getDueSubscriptions,
  getSubscriptionWithPlanById,
  updateSubscriptionBillingState as applySubscriptionBillingState,
} from "../db/subscriptions";
import { addSecondsToIso, nowIso } from "../http";
import type {
  Charge,
  Subscription,
  SubscriptionStatus,
  SubscriptionWithPlan,
} from "../types";
import { executeTransferFromSerializedKeys } from "./unlink";

export interface ChargeProcessingResult {
  charge: Charge;
  subscription: Subscription;
  outcome: "success" | "failed";
}

export interface CronRunSummary {
  startedAt: string;
  finishedAt: string;
  attempted: number;
  succeeded: number;
  failed: number;
  cancelledByFailure: number;
  completedByCap: number;
  skippedBecauseRunning: boolean;
}

class SubscriptionInactiveError extends Error {
  constructor(subscriptionId: string) {
    super(`Subscription ${subscriptionId} is no longer active.`);
  }
}

let cronMutex = false;
let cronTimer: ReturnType<typeof setInterval> | null = null;
let transferExecutor = executeTransferFromSerializedKeys;

export function setTransferExecutorForTests(
  executor: typeof executeTransferFromSerializedKeys | null,
): void {
  transferExecutor = executor ?? executeTransferFromSerializedKeys;
}

function computeNextStatusAfterSuccess(params: {
  subscription: SubscriptionWithPlan;
  newTotalSpent: string;
  chargedAt: string;
}): { status: SubscriptionStatus; cancelledAt: string | null } {
  const cap = BigInt(params.subscription.plan.spendingCap);
  if (cap > 0n && BigInt(params.newTotalSpent) >= cap) {
    return {
      status: "completed",
      cancelledAt: params.chargedAt,
    };
  }

  return {
    status: "active",
    cancelledAt: null,
  };
}

function nextChargeAt(subscription: SubscriptionWithPlan, chargedAt: string): string {
  return addSecondsToIso(chargedAt, subscription.plan.intervalSeconds);
}

export async function processSubscriptionCharge(params: {
  subscription: SubscriptionWithPlan;
  chargedAt?: string;
}): Promise<ChargeProcessingResult> {
  const chargedAt = params.chargedAt ?? nowIso();
  const freshSubscription = getSubscriptionWithPlanById(params.subscription.id);
  if (!freshSubscription || freshSubscription.status !== "active") {
    throw new SubscriptionInactiveError(params.subscription.id);
  }
  const subscription = freshSubscription;

  const pendingCharge = createCharge({
    id: crypto.randomUUID(),
    subscriptionId: subscription.id,
    amount: subscription.plan.amount,
    status: "pending",
    unlinkTxId: null,
    errorMessage: null,
    createdAt: chargedAt,
    completedAt: null,
  });

  const transfer = await transferExecutor({
    accountKeysJson: subscription.accountKeysEncrypted,
    recipientAddress: subscription.creator.unlinkAddress,
    amount: subscription.plan.amount,
    token: USDC_ADDRESS,
  });

  if (transfer.status === "success") {
    const totalSpent = (
      BigInt(subscription.totalSpent) + BigInt(subscription.plan.amount)
    ).toString();

    const statusAfterSuccess = computeNextStatusAfterSuccess({
      subscription,
      newTotalSpent: totalSpent,
      chargedAt,
    });

    const updatedSubscription = applySubscriptionBillingState({
      id: subscription.id,
      status: statusAfterSuccess.status,
      totalSpent,
      chargeCount: subscription.chargeCount + 1,
      consecutiveFailures: 0,
      lastChargedAt: chargedAt,
      nextChargeAt:
        statusAfterSuccess.status === "completed"
          ? chargedAt
          : nextChargeAt(subscription, chargedAt),
      cancelledAt: statusAfterSuccess.cancelledAt,
    });

    if (!updatedSubscription) {
      throw new Error(
        `Failed to update subscription billing state for ${subscription.id}.`,
      );
    }

    const completedCharge = updateChargeStatus({
      id: pendingCharge.id,
      status: "success",
      unlinkTxId: transfer.txId,
      errorMessage: null,
      completedAt: chargedAt,
    });

    if (!completedCharge) {
      throw new Error(`Failed to update charge ${pendingCharge.id} as success.`);
    }

    return {
      charge: completedCharge,
      subscription: updatedSubscription,
      outcome: "success",
    };
  }

  const failures = subscription.consecutiveFailures + 1;
  const shouldCancelByFailure = failures >= MAX_CONSECUTIVE_FAILURES;

  const updatedSubscription = applySubscriptionBillingState({
    id: subscription.id,
    status: shouldCancelByFailure ? "cancelled_by_failure" : "active",
    totalSpent: subscription.totalSpent,
    chargeCount: subscription.chargeCount,
    consecutiveFailures: failures,
    lastChargedAt: subscription.lastChargedAt,
    nextChargeAt: nextChargeAt(subscription, chargedAt),
    cancelledAt: shouldCancelByFailure ? chargedAt : subscription.cancelledAt,
  });

  if (!updatedSubscription) {
    throw new Error(`Failed to update failed billing state for ${subscription.id}.`);
  }

  const failedCharge = updateChargeStatus({
    id: pendingCharge.id,
    status: "failed",
    unlinkTxId: transfer.txId,
    errorMessage: transfer.errorMessage,
    completedAt: chargedAt,
  });

  if (!failedCharge) {
    throw new Error(`Failed to update charge ${pendingCharge.id} as failed.`);
  }

  return {
    charge: failedCharge,
    subscription: updatedSubscription,
    outcome: "failed",
  };
}

export async function runCronOnce(): Promise<CronRunSummary> {
  const startedAt = nowIso();

  if (cronMutex) {
    return {
      startedAt,
      finishedAt: nowIso(),
      attempted: 0,
      succeeded: 0,
      failed: 0,
      cancelledByFailure: 0,
      completedByCap: 0,
      skippedBecauseRunning: true,
    };
  }

  cronMutex = true;

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let cancelledByFailure = 0;
  let completedByCap = 0;

  try {
    const due = getDueSubscriptions({
      nowIso: startedAt,
      maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
      limit: 200,
    });

    for (const subscription of due) {
      attempted += 1;
      try {
        const result = await processSubscriptionCharge({
          subscription,
          chargedAt: nowIso(),
        });

        if (result.outcome === "success") {
          succeeded += 1;
        } else {
          failed += 1;
        }

        if (result.subscription.status === "cancelled_by_failure") {
          cancelledByFailure += 1;
        }

        if (result.subscription.status === "completed") {
          completedByCap += 1;
        }
      } catch (error) {
        if (error instanceof SubscriptionInactiveError) {
          attempted -= 1;
          continue;
        }

        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[cron] charge failed for subscription ${subscription.id}: ${message}`,
        );
      }
    }
  } finally {
    cronMutex = false;
  }

  return {
    startedAt,
    finishedAt: nowIso(),
    attempted,
    succeeded,
    failed,
    cancelledByFailure,
    completedByCap,
    skippedBecauseRunning: false,
  };
}

export function startCronExecutor(): void {
  if (cronTimer) {
    return;
  }

  cronTimer = setInterval(() => {
    void runCronOnce().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cron] run failed: ${message}`);
    });
  }, CRON_INTERVAL_MS);
}

export function stopCronExecutor(): void {
  if (!cronTimer) {
    return;
  }
  clearInterval(cronTimer);
  cronTimer = null;
}

export function isCronRunning(): boolean {
  return cronMutex;
}

export async function runChargeForSubscriptionId(
  subscriptionId: string,
): Promise<ChargeProcessingResult> {
  const subscription = getSubscriptionWithPlanById(subscriptionId);
  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }
  return processSubscriptionCharge({ subscription, chargedAt: nowIso() });
}
