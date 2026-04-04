import { getDatabase } from "./index";
import type { Charge, ChargeStatus } from "../types";

interface ChargeRow {
  id: string;
  subscription_id: string;
  amount: string;
  status: ChargeStatus;
  unlink_tx_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
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

export function createCharge(params: {
  id: string;
  subscriptionId: string;
  amount: string;
  status: ChargeStatus;
  unlinkTxId: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}): Charge {
  const db = getDatabase();

  db.prepare(
    `
      INSERT INTO charges (
        id, subscription_id, amount, status, unlink_tx_id,
        error_message, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    params.id,
    params.subscriptionId,
    params.amount,
    params.status,
    params.unlinkTxId,
    params.errorMessage,
    params.createdAt,
    params.completedAt,
  );

  const created = getChargeById(params.id);
  if (!created) {
    throw new Error("Failed to load charge after insert.");
  }
  return created;
}

export function getChargeById(id: string): Charge | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM charges WHERE id = ? LIMIT 1`)
    .get(id) as ChargeRow | null;

  return row ? mapCharge(row) : null;
}

export function updateChargeStatus(params: {
  id: string;
  status: ChargeStatus;
  unlinkTxId: string | null;
  errorMessage: string | null;
  completedAt: string | null;
}): Charge | null {
  const db = getDatabase();

  db.prepare(
    `
      UPDATE charges
      SET status = ?, unlink_tx_id = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `,
  ).run(
    params.status,
    params.unlinkTxId,
    params.errorMessage,
    params.completedAt,
    params.id,
  );

  return getChargeById(params.id);
}

export function listChargesBySubscriptionId(subscriptionId: string): Charge[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM charges
      WHERE subscription_id = ?
      ORDER BY created_at DESC
      `,
    )
    .all(subscriptionId) as ChargeRow[];

  return rows.map(mapCharge);
}
