import { getDatabase } from "../src/db";
import type {
  Charge,
  Creator,
  Plan,
  Subscription,
  SubscriptionStatus,
} from "../src/types";

interface CreatorRow {
  id: string;
  evm_address: string;
  unlink_address: string;
  name: string;
  webhook_url: string | null;
  api_key: string;
  created_at: string;
}

interface PlanRow {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  amount: string;
  interval_seconds: number;
  spending_cap: string;
  active: number;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  plan_id: string;
  auth_key_id: string;
  auth_public_key: `0x${string}`;
  unlink_address: string;
  account_keys_encrypted: string;
  status: SubscriptionStatus;
  total_spent: string;
  charge_count: number;
  consecutive_failures: number;
  last_charged_at: string | null;
  paid_through_at: string | null;
  next_charge_at: string;
  created_at: string;
  cancelled_at: string | null;
}

interface ChargeRow {
  id: string;
  subscription_id: string;
  amount: string;
  status: Charge["status"];
  unlink_tx_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ExplorerCreatorSummary {
  id: string;
  name: string;
  evmAddress: string;
  unlinkAddress: string;
  webhookUrl: string | null;
  apiKeyMasked: string;
  createdAt: string;
  planCount: number;
  activePlanCount: number;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  chargeCount: number;
  totalCharged: string;
}

export interface ExplorerPlanSummary {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUnlinkAddress: string;
  name: string;
  description: string;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
  active: boolean;
  createdAt: string;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  chargeCount: number;
  totalCharged: string;
  nextChargeAt: string | null;
}

export interface ExplorerSubscriberSummary {
  authKeyId: string;
  authPublicKey: `0x${string}`;
  createdAt: string;
  lastChargedAt: string | null;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  creatorCount: number;
  planCount: number;
  totalSpent: string;
}

export interface ExplorerSubscriptionSummary {
  id: string;
  planId: string;
  planName: string;
  creatorId: string;
  creatorName: string;
  authKeyId: string;
  authPublicKey: `0x${string}`;
  unlinkAddress: string;
  accountKeysMasked: string;
  status: SubscriptionStatus;
  totalSpent: string;
  chargeCount: number;
  consecutiveFailures: number;
  lastChargedAt: string | null;
  paidThroughAt: string | null;
  nextChargeAt: string;
  createdAt: string;
  cancelledAt: string | null;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
  dueState: "scheduled" | "overdue" | "stopped";
}

export interface ExplorerChargeSummary {
  id: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  creatorId: string;
  creatorName: string;
  authKeyId: string;
  amount: string;
  status: Charge["status"];
  unlinkTxId: string | null;
  errorMessageMasked: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ExplorerDashboardSnapshot {
  creatorCount: number;
  planCount: number;
  subscriberCount: number;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  completedSubscriptionCount: number;
  cancelledSubscriptionCount: number;
  dueNowCount: number;
  chargeCount: number;
  successfulChargeCount: number;
  failedChargeCount: number;
  totalCharged: string;
  recentCharges: ExplorerChargeSummary[];
  upcomingSubscriptions: ExplorerSubscriptionSummary[];
  failingSubscriptions: ExplorerSubscriptionSummary[];
  recentSubscriptions: ExplorerSubscriptionSummary[];
}

export interface ExplorerCreatorDetail {
  creator: ExplorerCreatorSummary;
  plans: ExplorerPlanSummary[];
  subscriptions: ExplorerSubscriptionSummary[];
  charges: ExplorerChargeSummary[];
}

export interface ExplorerPlanDetail {
  plan: ExplorerPlanSummary;
  creator: ExplorerCreatorSummary;
  subscriptions: ExplorerSubscriptionSummary[];
  charges: ExplorerChargeSummary[];
}

export interface ExplorerSubscriberDetail {
  subscriber: ExplorerSubscriberSummary;
  subscriptions: ExplorerSubscriptionSummary[];
  charges: ExplorerChargeSummary[];
  creators: ExplorerCreatorSummary[];
}

export interface ExplorerSubscriptionDetail {
  subscription: ExplorerSubscriptionSummary;
  creator: ExplorerCreatorSummary;
  plan: ExplorerPlanSummary;
  subscriber: ExplorerSubscriberSummary;
  charges: ExplorerChargeSummary[];
  accountKeysEncrypted: string;
}

export interface ExplorerChargeDetail {
  charge: ExplorerChargeSummary;
  subscription: ExplorerSubscriptionSummary;
  creator: ExplorerCreatorSummary;
  plan: ExplorerPlanSummary;
  subscriber: ExplorerSubscriberSummary;
}

interface ExplorerGraph {
  creators: ExplorerCreatorSummary[];
  creatorsById: Map<string, ExplorerCreatorSummary>;
  plans: ExplorerPlanSummary[];
  plansById: Map<string, ExplorerPlanSummary>;
  subscribers: ExplorerSubscriberSummary[];
  subscribersById: Map<string, ExplorerSubscriberSummary>;
  subscriptions: ExplorerSubscriptionSummary[];
  subscriptionsById: Map<string, ExplorerSubscriptionSummary>;
  subscriptionsByAuthKeyId: Map<string, ExplorerSubscriptionSummary[]>;
  charges: ExplorerChargeSummary[];
  chargesById: Map<string, ExplorerChargeSummary>;
  chargesBySubscriptionId: Map<string, ExplorerChargeSummary[]>;
  accountKeysBySubscriptionId: Map<string, string>;
}

function mapCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    evmAddress: row.evm_address,
    unlinkAddress: row.unlink_address,
    name: row.name,
    webhookUrl: row.webhook_url,
    apiKey: row.api_key,
    createdAt: row.created_at,
  };
}

function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    description: row.description,
    amount: row.amount,
    intervalSeconds: row.interval_seconds,
    spendingCap: row.spending_cap,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    planId: row.plan_id,
    authKeyId: row.auth_key_id,
    authPublicKey: row.auth_public_key,
    unlinkAddress: row.unlink_address,
    accountKeysEncrypted: row.account_keys_encrypted,
    status: row.status,
    totalSpent: row.total_spent,
    chargeCount: row.charge_count,
    consecutiveFailures: row.consecutive_failures,
    lastChargedAt: row.last_charged_at,
    paidThroughAt: row.paid_through_at,
    nextChargeAt: row.next_charge_at,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapCharge(row: ChargeRow): Charge {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    amount: row.amount,
    status: row.status,
    unlinkTxId: row.unlink_tx_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function sumAmounts(values: Iterable<string>): string {
  let total = 0n;
  for (const value of values) {
    total += BigInt(value);
  }
  return total.toString();
}

function compareIsoDesc(a: string | null, b: string | null): number {
  const aTime = a ? Date.parse(a) : 0;
  const bTime = b ? Date.parse(b) : 0;
  return bTime - aTime;
}

function compareIsoAsc(a: string | null, b: string | null): number {
  const aTime = a ? Date.parse(a) : Number.MAX_SAFE_INTEGER;
  const bTime = b ? Date.parse(b) : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let winner: string | null = null;
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (!winner || Date.parse(value) > Date.parse(winner)) {
      winner = value;
    }
  }
  return winner;
}

function minIso(values: Array<string | null | undefined>): string | null {
  let winner: string | null = null;
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (!winner || Date.parse(value) < Date.parse(winner)) {
      winner = value;
    }
  }
  return winner;
}

function maskAccountKeys(value: string): string {
  return `[redacted ${value.length} chars]`;
}

function isChargeableStatus(status: SubscriptionStatus): boolean {
  return status === "pending_activation" || status === "active" || status === "past_due";
}

function hasCurrentEntitlement(paidThroughAt: string | null): boolean {
  if (!paidThroughAt) {
    return false;
  }

  const paidThroughMs = Date.parse(paidThroughAt);
  return !Number.isNaN(paidThroughMs) && paidThroughMs > Date.now();
}

function dueState(status: SubscriptionStatus, nextChargeAt: string): "scheduled" | "overdue" | "stopped" {
  if (!isChargeableStatus(status)) {
    return "stopped";
  }

  return Date.parse(nextChargeAt) <= Date.now() ? "overdue" : "scheduled";
}

function loadGraph(): ExplorerGraph {
  const db = getDatabase();
  const creators = (db.prepare(`SELECT * FROM creators ORDER BY created_at DESC`).all() as CreatorRow[]).map(mapCreator);
  const plans = (db.prepare(`SELECT * FROM plans ORDER BY created_at DESC`).all() as PlanRow[]).map(mapPlan);
  const subscriptions = (
    db.prepare(`SELECT * FROM subscriptions ORDER BY created_at DESC`).all() as SubscriptionRow[]
  ).map(mapSubscription);
  const charges = (db.prepare(`SELECT * FROM charges ORDER BY created_at DESC`).all() as ChargeRow[]).map(mapCharge);

  const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const chargesBySubscriptionId = new Map<string, Charge[]>();
  const subscriptionsByAuthKeyId = new Map<string, Subscription[]>();

  for (const charge of charges) {
    const existing = chargesBySubscriptionId.get(charge.subscriptionId) ?? [];
    existing.push(charge);
    chargesBySubscriptionId.set(charge.subscriptionId, existing);
  }

  for (const subscription of subscriptions) {
    const existing = subscriptionsByAuthKeyId.get(subscription.authKeyId) ?? [];
    existing.push(subscription);
    subscriptionsByAuthKeyId.set(subscription.authKeyId, existing);
  }

  const creatorSummaries: ExplorerCreatorSummary[] = creators.map((creator) => {
    const creatorPlans = plans.filter((plan) => plan.creatorId === creator.id);
    const creatorPlanIds = new Set(creatorPlans.map((plan) => plan.id));
    const creatorSubscriptions = subscriptions.filter((subscription) => creatorPlanIds.has(subscription.planId));
    const creatorSubscriptionIds = new Set(creatorSubscriptions.map((subscription) => subscription.id));
    const creatorCharges = charges.filter((charge) => creatorSubscriptionIds.has(charge.subscriptionId));

    return {
      id: creator.id,
      name: creator.name,
      evmAddress: creator.evmAddress,
      unlinkAddress: creator.unlinkAddress,
      webhookUrl: creator.webhookUrl,
      apiKeyMasked: `${creator.apiKey.slice(0, 4)}...${creator.apiKey.slice(-4)}`,
      createdAt: creator.createdAt,
      planCount: creatorPlans.length,
      activePlanCount: creatorPlans.filter((plan) => plan.active).length,
      subscriptionCount: creatorSubscriptions.length,
      activeSubscriptionCount: creatorSubscriptions.filter((subscription) => hasCurrentEntitlement(subscription.paidThroughAt)).length,
      chargeCount: creatorCharges.length,
      totalCharged: sumAmounts(
        creatorCharges.filter((charge) => charge.status === "success").map((charge) => charge.amount),
      ),
    };
  });
  const creatorSummariesById = new Map(creatorSummaries.map((creator) => [creator.id, creator]));

  const planSummaries: ExplorerPlanSummary[] = plans.map((plan) => {
    const creator = creatorsById.get(plan.creatorId);
    if (!creator) {
      throw new Error(`Missing creator ${plan.creatorId} for plan ${plan.id}`);
    }

    const planSubscriptions = subscriptions.filter((subscription) => subscription.planId === plan.id);
    const planSubscriptionIds = new Set(planSubscriptions.map((subscription) => subscription.id));
    const planCharges = charges.filter((charge) => planSubscriptionIds.has(charge.subscriptionId));
    const nextChargeAt = maxIso(
      planSubscriptions
        .filter((subscription) => isChargeableStatus(subscription.status))
        .map((subscription) => subscription.nextChargeAt),
    );

    return {
      id: plan.id,
      creatorId: plan.creatorId,
      creatorName: creator.name,
      creatorUnlinkAddress: creator.unlinkAddress,
      name: plan.name,
      description: plan.description,
      amount: plan.amount,
      intervalSeconds: plan.intervalSeconds,
      spendingCap: plan.spendingCap,
      active: plan.active,
      createdAt: plan.createdAt,
      subscriptionCount: planSubscriptions.length,
      activeSubscriptionCount: planSubscriptions.filter((subscription) => hasCurrentEntitlement(subscription.paidThroughAt)).length,
      chargeCount: planCharges.length,
      totalCharged: sumAmounts(planCharges.filter((charge) => charge.status === "success").map((charge) => charge.amount)),
      nextChargeAt,
    };
  });
  const planSummariesById = new Map(planSummaries.map((plan) => [plan.id, plan]));

  const subscriptionSummaries: ExplorerSubscriptionSummary[] = subscriptions.map((subscription) => {
    const plan = plansById.get(subscription.planId);
    if (!plan) {
      throw new Error(`Missing plan ${subscription.planId} for subscription ${subscription.id}`);
    }
    const creator = creatorsById.get(plan.creatorId);
    if (!creator) {
      throw new Error(`Missing creator ${plan.creatorId} for subscription ${subscription.id}`);
    }

    return {
      id: subscription.id,
      planId: subscription.planId,
      planName: plan.name,
      creatorId: creator.id,
      creatorName: creator.name,
      authKeyId: subscription.authKeyId,
      authPublicKey: subscription.authPublicKey,
      unlinkAddress: subscription.unlinkAddress,
      accountKeysMasked: maskAccountKeys(subscription.accountKeysEncrypted),
      status: subscription.status,
      totalSpent: subscription.totalSpent,
      chargeCount: subscription.chargeCount,
      consecutiveFailures: subscription.consecutiveFailures,
      lastChargedAt: subscription.lastChargedAt,
      paidThroughAt: subscription.paidThroughAt,
      nextChargeAt: subscription.nextChargeAt,
      createdAt: subscription.createdAt,
      cancelledAt: subscription.cancelledAt,
      amount: plan.amount,
      intervalSeconds: plan.intervalSeconds,
      spendingCap: plan.spendingCap,
      dueState: dueState(subscription.status, subscription.nextChargeAt),
    };
  });
  const subscriptionSummariesById = new Map(subscriptionSummaries.map((subscription) => [subscription.id, subscription]));
  const subscriptionSummariesByAuthKeyId = new Map<string, ExplorerSubscriptionSummary[]>();
  for (const subscription of subscriptionSummaries) {
    const existing = subscriptionSummariesByAuthKeyId.get(subscription.authKeyId) ?? [];
    existing.push(subscription);
    subscriptionSummariesByAuthKeyId.set(subscription.authKeyId, existing);
  }

  const subscriberSummaries: ExplorerSubscriberSummary[] = [...subscriptionsByAuthKeyId.entries()].map(
    ([authKeyId, groupedSubscriptions]) => {
      const relatedPlans = groupedSubscriptions.map((subscription) => plansById.get(subscription.planId)).filter(Boolean) as Plan[];
      return {
        authKeyId,
        authPublicKey: groupedSubscriptions[0]?.authPublicKey ?? "0x" as `0x${string}`,
        createdAt:
          minIso(groupedSubscriptions.map((subscription) => subscription.createdAt)) ??
          groupedSubscriptions[0]?.createdAt ??
          new Date(0).toISOString(),
        lastChargedAt: maxIso(groupedSubscriptions.map((subscription) => subscription.lastChargedAt)),
        subscriptionCount: groupedSubscriptions.length,
        activeSubscriptionCount: groupedSubscriptions.filter((subscription) => hasCurrentEntitlement(subscription.paidThroughAt)).length,
        creatorCount: new Set(relatedPlans.map((plan) => plan.creatorId)).size,
        planCount: new Set(relatedPlans.map((plan) => plan.id)).size,
        totalSpent: sumAmounts(groupedSubscriptions.map((subscription) => subscription.totalSpent)),
      };
    },
  ).sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt));
  const subscriberSummariesById = new Map(subscriberSummaries.map((subscriber) => [subscriber.authKeyId, subscriber]));

  const chargeSummaries: ExplorerChargeSummary[] = charges.map((charge) => {
    const subscription = subscriptions.find((entry) => entry.id === charge.subscriptionId);
    if (!subscription) {
      throw new Error(`Missing subscription ${charge.subscriptionId} for charge ${charge.id}`);
    }
    const plan = plansById.get(subscription.planId);
    if (!plan) {
      throw new Error(`Missing plan ${subscription.planId} for charge ${charge.id}`);
    }
    const creator = creatorsById.get(plan.creatorId);
    if (!creator) {
      throw new Error(`Missing creator ${plan.creatorId} for charge ${charge.id}`);
    }

    return {
      id: charge.id,
      subscriptionId: charge.subscriptionId,
      planId: plan.id,
      planName: plan.name,
      creatorId: creator.id,
      creatorName: creator.name,
      authKeyId: subscription.authKeyId,
      amount: charge.amount,
      status: charge.status,
      unlinkTxId: charge.unlinkTxId,
      errorMessageMasked: charge.errorMessage ? "Charge failed." : null,
      createdAt: charge.createdAt,
      completedAt: charge.completedAt,
    };
  });
  const chargeSummariesById = new Map(chargeSummaries.map((charge) => [charge.id, charge]));
  const chargeSummariesBySubscriptionId = new Map<string, ExplorerChargeSummary[]>();
  for (const charge of chargeSummaries) {
    const existing = chargeSummariesBySubscriptionId.get(charge.subscriptionId) ?? [];
    existing.push(charge);
    chargeSummariesBySubscriptionId.set(charge.subscriptionId, existing);
  }

  const accountKeysBySubscriptionId = new Map(subscriptions.map((subscription) => [subscription.id, subscription.accountKeysEncrypted]));

  return {
    creators: creatorSummaries,
    creatorsById: creatorSummariesById,
    plans: planSummaries,
    plansById: planSummariesById,
    subscribers: subscriberSummaries,
    subscribersById: subscriberSummariesById,
    subscriptions: subscriptionSummaries,
    subscriptionsById: subscriptionSummariesById,
    subscriptionsByAuthKeyId: subscriptionSummariesByAuthKeyId,
    charges: chargeSummaries,
    chargesById: chargeSummariesById,
    chargesBySubscriptionId: chargeSummariesBySubscriptionId,
    accountKeysBySubscriptionId,
  };
}

export function getDashboardSnapshot(): ExplorerDashboardSnapshot {
  const graph = loadGraph();
  const activeSubscriptions = graph.subscriptions.filter((subscription) => hasCurrentEntitlement(subscription.paidThroughAt));
  const chargeableSubscriptions = graph.subscriptions.filter((subscription) => isChargeableStatus(subscription.status));

  return {
    creatorCount: graph.creators.length,
    planCount: graph.plans.length,
    subscriberCount: graph.subscribers.length,
    subscriptionCount: graph.subscriptions.length,
    activeSubscriptionCount: activeSubscriptions.length,
    completedSubscriptionCount: graph.subscriptions.filter((subscription) => subscription.status === "completed").length,
    cancelledSubscriptionCount: graph.subscriptions.filter(
      (subscription) => subscription.status === "cancelled" || subscription.status === "cancelled_by_failure",
    ).length,
    dueNowCount: chargeableSubscriptions.filter((subscription) => subscription.dueState === "overdue").length,
    chargeCount: graph.charges.length,
    successfulChargeCount: graph.charges.filter((charge) => charge.status === "success").length,
    failedChargeCount: graph.charges.filter((charge) => charge.status === "failed").length,
    totalCharged: sumAmounts(graph.charges.filter((charge) => charge.status === "success").map((charge) => charge.amount)),
    recentCharges: [...graph.charges].sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt)).slice(0, 8),
    upcomingSubscriptions: [...chargeableSubscriptions]
      .sort((a, b) => compareIsoAsc(a.nextChargeAt, b.nextChargeAt))
      .slice(0, 8),
    failingSubscriptions: [...graph.subscriptions]
      .filter((subscription) => subscription.consecutiveFailures > 0 || subscription.status === "cancelled_by_failure")
      .sort((a, b) => b.consecutiveFailures - a.consecutiveFailures || compareIsoDesc(a.createdAt, b.createdAt))
      .slice(0, 8),
    recentSubscriptions: [...graph.subscriptions]
      .sort((a, b) => compareIsoDesc(a.createdAt, b.createdAt))
      .slice(0, 8),
  };
}

export function listCreators(): ExplorerCreatorSummary[] {
  return loadGraph().creators;
}

export function getCreatorDetail(creatorId: string): ExplorerCreatorDetail | null {
  const graph = loadGraph();
  const creator = graph.creatorsById.get(creatorId);
  if (!creator) {
    return null;
  }

  const plans = graph.plans.filter((plan) => plan.creatorId === creatorId);
  const planIds = new Set(plans.map((plan) => plan.id));
  const subscriptions = graph.subscriptions.filter((subscription) => planIds.has(subscription.planId));
  const subscriptionIds = new Set(subscriptions.map((subscription) => subscription.id));
  const charges = graph.charges.filter((charge) => subscriptionIds.has(charge.subscriptionId));

  return { creator, plans, subscriptions, charges };
}

export function listPlans(): ExplorerPlanSummary[] {
  return loadGraph().plans;
}

export function getPlanDetail(planId: string): ExplorerPlanDetail | null {
  const graph = loadGraph();
  const plan = graph.plansById.get(planId);
  if (!plan) {
    return null;
  }

  const creator = graph.creatorsById.get(plan.creatorId);
  if (!creator) {
    return null;
  }

  const subscriptions = graph.subscriptions.filter((subscription) => subscription.planId === planId);
  const subscriptionIds = new Set(subscriptions.map((subscription) => subscription.id));
  const charges = graph.charges.filter((charge) => subscriptionIds.has(charge.subscriptionId));

  return { plan, creator, subscriptions, charges };
}

export function listSubscribers(): ExplorerSubscriberSummary[] {
  return loadGraph().subscribers;
}

export function getSubscriberDetail(authKeyId: string): ExplorerSubscriberDetail | null {
  const graph = loadGraph();
  const subscriber = graph.subscribersById.get(authKeyId.toLowerCase());
  if (!subscriber) {
    return null;
  }

  const subscriptions = graph.subscriptionsByAuthKeyId.get(subscriber.authKeyId) ?? [];
  const charges = subscriptions.flatMap((subscription) => graph.chargesBySubscriptionId.get(subscription.id) ?? []);
  const creatorIds = new Set(subscriptions.map((subscription) => subscription.creatorId));
  const creators = [...creatorIds]
    .map((creatorId) => graph.creatorsById.get(creatorId))
    .filter(Boolean) as ExplorerCreatorSummary[];

  return { subscriber, subscriptions, charges, creators };
}

export function listSubscriptions(filters?: {
  creatorId?: string;
  planId?: string;
  authKeyId?: string;
  status?: SubscriptionStatus | "all";
}): ExplorerSubscriptionSummary[] {
  const graph = loadGraph();
  return graph.subscriptions.filter((subscription) => {
    if (filters?.creatorId && subscription.creatorId !== filters.creatorId) {
      return false;
    }
    if (filters?.planId && subscription.planId !== filters.planId) {
      return false;
    }
    if (filters?.authKeyId && subscription.authKeyId !== filters.authKeyId.toLowerCase()) {
      return false;
    }
    if (filters?.status && filters.status !== "all" && subscription.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export function getSubscriptionDetail(subscriptionId: string): ExplorerSubscriptionDetail | null {
  const graph = loadGraph();
  const subscription = graph.subscriptionsById.get(subscriptionId);
  if (!subscription) {
    return null;
  }

  const creator = graph.creatorsById.get(subscription.creatorId);
  const plan = graph.plansById.get(subscription.planId);
  const subscriber = graph.subscribersById.get(subscription.authKeyId);
  if (!creator || !plan || !subscriber) {
    return null;
  }

  return {
    subscription,
    creator,
    plan,
    subscriber,
    charges: graph.chargesBySubscriptionId.get(subscriptionId) ?? [],
    accountKeysEncrypted: graph.accountKeysBySubscriptionId.get(subscriptionId) ?? "",
  };
}

export function listCharges(filters?: {
  creatorId?: string;
  subscriptionId?: string;
  status?: Charge["status"] | "all";
}): ExplorerChargeSummary[] {
  const graph = loadGraph();
  return graph.charges.filter((charge) => {
    if (filters?.creatorId && charge.creatorId !== filters.creatorId) {
      return false;
    }
    if (filters?.subscriptionId && charge.subscriptionId !== filters.subscriptionId) {
      return false;
    }
    if (filters?.status && filters.status !== "all" && charge.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export function getChargeDetail(chargeId: string): ExplorerChargeDetail | null {
  const graph = loadGraph();
  const charge = graph.chargesById.get(chargeId);
  if (!charge) {
    return null;
  }

  const subscription = graph.subscriptionsById.get(charge.subscriptionId);
  if (!subscription) {
    return null;
  }
  const creator = graph.creatorsById.get(subscription.creatorId);
  const plan = graph.plansById.get(subscription.planId);
  const subscriber = graph.subscribersById.get(subscription.authKeyId);
  if (!creator || !plan || !subscriber) {
    return null;
  }

  return { charge, subscription, creator, plan, subscriber };
}
