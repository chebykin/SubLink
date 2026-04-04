import { getDatabase } from "./index";
import type {
  Creator,
  Plan,
  Subscription,
  SubscriptionStatus,
  SubscriptionWithPlan,
} from "../types";

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

interface SubscriptionWithRelationsRow extends SubscriptionRow {
  plan_name: string;
  plan_description: string;
  plan_amount: string;
  plan_interval_seconds: number;
  plan_spending_cap: string;
  plan_active: number;
  plan_created_at: string;

  creator_id: string;
  creator_evm_address: string;
  creator_unlink_address: string;
  creator_name: string;
  creator_webhook_url: string | null;
  creator_api_key: string;
  creator_created_at: string;
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

function mapPlan(row: SubscriptionWithRelationsRow): Plan {
  return {
    id: row.plan_id,
    creatorId: row.creator_id,
    name: row.plan_name,
    description: row.plan_description,
    amount: row.plan_amount,
    intervalSeconds: row.plan_interval_seconds,
    spendingCap: row.plan_spending_cap,
    active: row.plan_active === 1,
    createdAt: row.plan_created_at,
  };
}

function mapCreator(row: SubscriptionWithRelationsRow): Creator {
  return {
    id: row.creator_id,
    evmAddress: row.creator_evm_address,
    unlinkAddress: row.creator_unlink_address,
    name: row.creator_name,
    webhookUrl: row.creator_webhook_url,
    apiKey: row.creator_api_key,
    createdAt: row.creator_created_at,
  };
}

function mapSubscriptionWithPlan(row: SubscriptionWithRelationsRow): SubscriptionWithPlan {
  return {
    ...mapSubscription(row),
    plan: mapPlan(row),
    creator: mapCreator(row),
  };
}

export function createSubscription(params: {
  id: string;
  planId: string;
  authKeyId: string;
  authPublicKey: `0x${string}`;
  unlinkAddress: string;
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
}): Subscription {
  const db = getDatabase();

  db.prepare(
    `
      INSERT INTO subscriptions (
        id, plan_id, auth_key_id, auth_public_key, unlink_address, account_keys_encrypted,
        status, total_spent, charge_count, consecutive_failures,
        last_charged_at, paid_through_at, next_charge_at, created_at, cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    params.id,
    params.planId,
    params.authKeyId,
    params.authPublicKey,
    params.unlinkAddress,
    params.accountKeysEncrypted,
    params.status,
    params.totalSpent,
    params.chargeCount,
    params.consecutiveFailures,
    params.lastChargedAt,
    params.paidThroughAt,
    params.nextChargeAt,
    params.createdAt,
    params.cancelledAt,
  );

  const created = getSubscriptionById(params.id);
  if (!created) {
    throw new Error("Failed to load subscription after insert.");
  }

  return created;
}

export function getSubscriptionById(id: string): Subscription | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM subscriptions WHERE id = ? LIMIT 1`)
    .get(id) as SubscriptionRow | null;

  return row ? mapSubscription(row) : null;
}

export function getSubscriptionByPlanAndAuthKeyId(
  planId: string,
  authKeyId: string,
): Subscription | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT *
      FROM subscriptions
      WHERE plan_id = ? AND auth_key_id = ?
      LIMIT 1
      `,
    )
    .get(planId, authKeyId) as SubscriptionRow | null;

  return row ? mapSubscription(row) : null;
}

export function getSubscriptionWithPlanById(id: string): SubscriptionWithPlan | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT
        s.*,
        p.name AS plan_name,
        p.description AS plan_description,
        p.amount AS plan_amount,
        p.interval_seconds AS plan_interval_seconds,
        p.spending_cap AS plan_spending_cap,
        p.active AS plan_active,
        p.created_at AS plan_created_at,
        c.id AS creator_id,
        c.evm_address AS creator_evm_address,
        c.unlink_address AS creator_unlink_address,
        c.name AS creator_name,
        c.webhook_url AS creator_webhook_url,
        c.api_key AS creator_api_key,
        c.created_at AS creator_created_at
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      JOIN creators c ON c.id = p.creator_id
      WHERE s.id = ?
      LIMIT 1
      `,
    )
    .get(id) as SubscriptionWithRelationsRow | null;

  return row ? mapSubscriptionWithPlan(row) : null;
}

export function listSubscriptions(filters: {
  authKeyId?: string;
  planId?: string;
  creatorId?: string;
}): SubscriptionWithPlan[] {
  const db = getDatabase();

  let sql = `
    SELECT
      s.*,
      p.name AS plan_name,
      p.description AS plan_description,
      p.amount AS plan_amount,
      p.interval_seconds AS plan_interval_seconds,
      p.spending_cap AS plan_spending_cap,
      p.active AS plan_active,
      p.created_at AS plan_created_at,
      c.id AS creator_id,
      c.evm_address AS creator_evm_address,
      c.unlink_address AS creator_unlink_address,
      c.name AS creator_name,
      c.webhook_url AS creator_webhook_url,
      c.api_key AS creator_api_key,
      c.created_at AS creator_created_at
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    JOIN creators c ON c.id = p.creator_id
    WHERE 1=1
  `;

  const args: string[] = [];

  if (filters.authKeyId) {
    sql += ` AND s.auth_key_id = ?`;
    args.push(filters.authKeyId);
  }

  if (filters.planId) {
    sql += ` AND s.plan_id = ?`;
    args.push(filters.planId);
  }

  if (filters.creatorId) {
    sql += ` AND p.creator_id = ?`;
    args.push(filters.creatorId);
  }

  sql += ` ORDER BY s.created_at DESC`;

  const rows = db.prepare(sql).all(...args) as SubscriptionWithRelationsRow[];
  return rows.map(mapSubscriptionWithPlan);
}

export function cancelSubscription(
  id: string,
  status: "cancelled" | "cancelled_by_failure" | "completed",
  cancelledAt: string,
): Subscription | null {
  const db = getDatabase();
  db.prepare(
    `
      UPDATE subscriptions
      SET status = ?, cancelled_at = ?
      WHERE id = ?
    `,
  ).run(status, cancelledAt, id);

  return getSubscriptionById(id);
}

export function updateSubscriptionBillingState(params: {
  id: string;
  status: SubscriptionStatus;
  totalSpent: string;
  chargeCount: number;
  consecutiveFailures: number;
  lastChargedAt: string | null;
  paidThroughAt: string | null;
  nextChargeAt: string;
  cancelledAt: string | null;
}): Subscription | null {
  const db = getDatabase();

  db.prepare(
    `
      UPDATE subscriptions
      SET
        status = ?,
        total_spent = ?,
        charge_count = ?,
        consecutive_failures = ?,
        last_charged_at = ?,
        paid_through_at = ?,
        next_charge_at = ?,
        cancelled_at = ?
      WHERE id = ?
    `,
  ).run(
    params.status,
    params.totalSpent,
    params.chargeCount,
    params.consecutiveFailures,
    params.lastChargedAt,
    params.paidThroughAt,
    params.nextChargeAt,
    params.cancelledAt,
    params.id,
  );

  return getSubscriptionById(params.id);
}

export function getDueSubscriptions(params: {
  nowIso: string;
  maxConsecutiveFailures: number;
  limit?: number;
}): SubscriptionWithPlan[] {
  const db = getDatabase();
  const limit = params.limit ?? 100;

  const rows = db
    .prepare(
      `
      SELECT
        s.*,
        p.name AS plan_name,
        p.description AS plan_description,
        p.amount AS plan_amount,
        p.interval_seconds AS plan_interval_seconds,
        p.spending_cap AS plan_spending_cap,
        p.active AS plan_active,
        p.created_at AS plan_created_at,
        c.id AS creator_id,
        c.evm_address AS creator_evm_address,
        c.unlink_address AS creator_unlink_address,
        c.name AS creator_name,
        c.webhook_url AS creator_webhook_url,
        c.api_key AS creator_api_key,
        c.created_at AS creator_created_at
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      JOIN creators c ON c.id = p.creator_id
      WHERE
        s.status IN ('pending_activation', 'active', 'past_due')
        AND s.next_charge_at <= ?
        AND s.consecutive_failures < ?
      ORDER BY s.next_charge_at ASC
      LIMIT ?
      `,
    )
    .all(
      params.nowIso,
      params.maxConsecutiveFailures,
      limit,
    ) as SubscriptionWithRelationsRow[];

  return rows.map(mapSubscriptionWithPlan);
}
