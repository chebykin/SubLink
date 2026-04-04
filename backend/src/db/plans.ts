import { getDatabase } from "./index";
import type { Plan, PlanWithCreator } from "../types";

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

interface PlanWithCreatorRow extends PlanRow {
  creator_name: string;
  creator_unlink_address: string;
  creator_evm_address: string;
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

function mapPlanWithCreator(row: PlanWithCreatorRow): PlanWithCreator {
  const plan = mapPlan(row);
  return {
    ...plan,
    creator: {
      id: row.creator_id,
      name: row.creator_name,
      unlinkAddress: row.creator_unlink_address,
      evmAddress: row.creator_evm_address,
    },
  };
}

export function createPlan(params: {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  amount: string;
  intervalSeconds: number;
  spendingCap: string;
  active: boolean;
  createdAt: string;
}): Plan {
  const db = getDatabase();

  db.prepare(
    `
      INSERT INTO plans (
        id, creator_id, name, description, amount, interval_seconds,
        spending_cap, active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    params.id,
    params.creatorId,
    params.name,
    params.description,
    params.amount,
    params.intervalSeconds,
    params.spendingCap,
    params.active ? 1 : 0,
    params.createdAt,
  );

  const created = getPlanById(params.id);
  if (!created) {
    throw new Error("Failed to load plan after insert.");
  }
  return created;
}

export function getPlanById(id: string): Plan | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM plans WHERE id = ? LIMIT 1`)
    .get(id) as PlanRow | null;

  return row ? mapPlan(row) : null;
}

export function getPlanWithCreatorById(id: string): PlanWithCreator | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT
        p.*,
        c.name AS creator_name,
        c.unlink_address AS creator_unlink_address,
        c.evm_address AS creator_evm_address
      FROM plans p
      JOIN creators c ON c.id = p.creator_id
      WHERE p.id = ?
      LIMIT 1
      `,
    )
    .get(id) as PlanWithCreatorRow | null;

  return row ? mapPlanWithCreator(row) : null;
}

export function listActivePlans(creatorId?: string): Plan[] {
  const db = getDatabase();

  const rows = creatorId
    ? (db
        .prepare(
          `
          SELECT *
          FROM plans
          WHERE active = 1 AND creator_id = ?
          ORDER BY created_at DESC
          `,
        )
        .all(creatorId) as PlanRow[])
    : (db
        .prepare(
          `
          SELECT *
          FROM plans
          WHERE active = 1
          ORDER BY created_at DESC
          `,
        )
        .all() as PlanRow[]);

  return rows.map(mapPlan);
}
