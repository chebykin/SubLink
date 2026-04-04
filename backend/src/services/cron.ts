import {
  CRON_INTERVAL_MS,
  MAX_CONSECUTIVE_FAILURES,
  PENDING_ACTIVATION_RETRY_SECONDS,
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
import { logError, logInfo, logWarn } from "../log";
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

export class SubscriptionInactiveError extends Error {
  constructor(subscriptionId: string) {
    super(`Subscription ${subscriptionId} is no longer chargeable.`);
  }
}

let cronMutex = false;
let cronTimer: ReturnType<typeof setInterval> | null = null;
let transferExecutor = executeTransferFromSerializedKeys;
const subscriptionChargeLocks = new Map<string, Promise<void>>();

export function setTransferExecutorForTests(
  executor: typeof executeTransferFromSerializedKeys | null,
): void {
  transferExecutor = executor ?? executeTransferFromSerializedKeys;
}

export function resetSubscriptionChargeLocksForTests(): void {
  subscriptionChargeLocks.clear();
}

async function withSubscriptionChargeLock<T>(
  subscriptionId: string,
  task: () => Promise<T>,
): Promise<T> {
  const previous = subscriptionChargeLocks.get(subscriptionId);
  let releaseLock!: () => void;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  subscriptionChargeLocks.set(subscriptionId, lock);

  if (previous) {
    await previous.catch(() => undefined);
  }

  try {
    return await task();
  } finally {
    releaseLock();
    if (subscriptionChargeLocks.get(subscriptionId) === lock) {
      subscriptionChargeLocks.delete(subscriptionId);
    }
  }
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

function isChargeableStatus(status: SubscriptionStatus): boolean {
  return (
    status === "pending_activation" ||
    status === "active" ||
    status === "past_due"
  );
}

function computePaidThroughAt(subscription: SubscriptionWithPlan, chargedAt: string): string {
  const paidThroughAt = subscription.paidThroughAt;
  if (!paidThroughAt) {
    return addSecondsToIso(chargedAt, subscription.plan.intervalSeconds);
  }

  const entitlementStart =
    Date.parse(paidThroughAt) > Date.parse(chargedAt) ? paidThroughAt : chargedAt;
  return addSecondsToIso(entitlementStart, subscription.plan.intervalSeconds);
}

function nextChargeAt(subscription: SubscriptionWithPlan, chargedAt: string): string {
  return addSecondsToIso(chargedAt, subscription.plan.intervalSeconds);
}

function nextRetryAt(subscription: SubscriptionWithPlan, chargedAt: string): string {
  if (subscription.paidThroughAt === null) {
    return addSecondsToIso(chargedAt, PENDING_ACTIVATION_RETRY_SECONDS);
  }

  return nextChargeAt(subscription, chargedAt);
}

export async function processSubscriptionCharge(params: {
  subscription: SubscriptionWithPlan;
  chargedAt?: string;
  source?: "subscribe_initial" | "subscribe_retry" | "cron" | "manual";
  allowedStatuses?: SubscriptionStatus[];
}): Promise<ChargeProcessingResult> {
  return withSubscriptionChargeLock(params.subscription.id, async () => {
    const chargedAt = params.chargedAt ?? nowIso();
    const source = params.source ?? "manual";
    const allowedStatuses = params.allowedStatuses ?? [
      "pending_activation",
      "active",
      "past_due",
    ];
    const freshSubscription = getSubscriptionWithPlanById(params.subscription.id);
    if (
      !freshSubscription ||
      !isChargeableStatus(freshSubscription.status) ||
      !allowedStatuses.includes(freshSubscription.status)
    ) {
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
      const paidThroughAt = computePaidThroughAt(subscription, chargedAt);

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
        paidThroughAt,
        nextChargeAt: paidThroughAt,
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

      logInfo("charge.succeeded", {
        source,
        chargeId: completedCharge.id,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        creatorId: subscription.creator.id,
        amount: subscription.plan.amount,
        unlinkTxId: transfer.txId,
        totalSpent,
        chargeCount: updatedSubscription.chargeCount,
        subscriptionStatus: updatedSubscription.status,
        chargedAt,
      });

      return {
        charge: completedCharge,
        subscription: updatedSubscription,
        outcome: "success",
      };
    }

    const failures = subscription.consecutiveFailures + 1;
    const shouldCancelByFailure = failures >= MAX_CONSECUTIVE_FAILURES;
    const hasEntitlement = subscription.paidThroughAt !== null;
    const statusAfterFailure: SubscriptionStatus = shouldCancelByFailure
      ? "cancelled_by_failure"
      : hasEntitlement
        ? "past_due"
        : "pending_activation";

    const updatedSubscription = applySubscriptionBillingState({
      id: subscription.id,
      status: statusAfterFailure,
      totalSpent: subscription.totalSpent,
      chargeCount: subscription.chargeCount,
      consecutiveFailures: failures,
      lastChargedAt: subscription.lastChargedAt,
      paidThroughAt: subscription.paidThroughAt,
      nextChargeAt: nextRetryAt(subscription, chargedAt),
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

    logWarn("charge.failed", {
      source,
      chargeId: failedCharge.id,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      creatorId: subscription.creator.id,
      amount: subscription.plan.amount,
      unlinkTxId: transfer.txId,
      errorMessage: transfer.errorMessage,
      consecutiveFailures: updatedSubscription.consecutiveFailures,
      subscriptionStatus: updatedSubscription.status,
      chargedAt,
    });

    return {
      charge: failedCharge,
      subscription: updatedSubscription,
      outcome: "failed",
    };
  });
}

export async function runCronOnce(): Promise<CronRunSummary> {
  const startedAt = nowIso();

  if (cronMutex) {
    logWarn("cron.run.skipped", {
      reason: "already_running",
      startedAt,
    });
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
    logInfo("cron.run.started", {
      startedAt,
    });
    const due = getDueSubscriptions({
      nowIso: startedAt,
      maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
      limit: 200,
    });

    logInfo("cron.run.due_subscriptions_loaded", {
      startedAt,
      dueCount: due.length,
    });

    for (const subscription of due) {
      attempted += 1;
      try {
        const result = await processSubscriptionCharge({
          subscription,
          chargedAt: nowIso(),
          source: "cron",
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
        logError("cron.charge.processing_failed", {
          subscriptionId: subscription.id,
          planId: subscription.planId,
          message,
        });
      }
    }
  } finally {
    cronMutex = false;
  }

  const summary = {
    startedAt,
    finishedAt: nowIso(),
    attempted,
    succeeded,
    failed,
    cancelledByFailure,
    completedByCap,
    skippedBecauseRunning: false,
  };

  logInfo("cron.run.completed", {
    ...summary,
    durationMs:
      Date.parse(summary.finishedAt) - Date.parse(summary.startedAt),
  });

  return summary;
}

export function startCronExecutor(): void {
  if (cronTimer) {
    return;
  }

  cronTimer = setInterval(() => {
    void runCronOnce().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logError("cron.run.failed", {
        message,
      });
    });
  }, CRON_INTERVAL_MS);

  logInfo("cron.executor.started", {
    intervalMs: CRON_INTERVAL_MS,
  });
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
  return processSubscriptionCharge({
    subscription,
    chargedAt: nowIso(),
    source: "manual",
  });
}
