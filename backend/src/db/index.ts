import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { Database } from "bun:sqlite";

import { DB_PATH } from "../config";

let dbInstance: Database | null = null;

interface TableInfoRow {
  name: string;
}

function hasTable(db: Database, tableName: string): boolean {
  const row = db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        LIMIT 1
      `,
    )
    .get(tableName) as TableInfoRow | null;
  return row !== null;
}

function isRev3SubscriptionsSchema(db: Database): boolean {
  if (!hasTable(db, "subscriptions")) {
    return true;
  }

  const rows = db
    .prepare(`PRAGMA table_info(subscriptions)`)
    .all() as Array<{ name: string }>;
  const columnNames = new Set(rows.map((row) => row.name));

  return (
    columnNames.has("auth_key_id") &&
    columnNames.has("auth_public_key") &&
    !columnNames.has("subscriber_evm_address")
  );
}

function resetSchema(db: Database): void {
  db.exec(`
    DROP TABLE IF EXISTS charges;
    DROP TABLE IF EXISTS subscriptions;
    DROP TABLE IF EXISTS plans;
    DROP TABLE IF EXISTS creators;
  `);
}

function ensureSchema(db: Database): void {
  if (!isRev3SubscriptionsSchema(db)) {
    console.warn(
      "[db] resetting SQLite schema to rev 3 auth-key model. Existing local data will be removed.",
    );
    resetSchema(db);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      evm_address TEXT NOT NULL UNIQUE,
      unlink_address TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      webhook_url TEXT,
      api_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      amount TEXT NOT NULL,
      interval_seconds INTEGER NOT NULL,
      spending_cap TEXT NOT NULL,
      active INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES creators(id)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      auth_key_id TEXT NOT NULL,
      auth_public_key TEXT NOT NULL,
      unlink_address TEXT NOT NULL,
      account_keys_encrypted TEXT NOT NULL,
      status TEXT NOT NULL,
      total_spent TEXT NOT NULL,
      charge_count INTEGER NOT NULL,
      consecutive_failures INTEGER NOT NULL,
      last_charged_at TEXT,
      next_charge_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      cancelled_at TEXT,
      UNIQUE(plan_id, auth_key_id),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS charges (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL,
      unlink_tx_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_plans_creator ON plans(creator_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status_due ON subscriptions(status, next_charge_at);
    CREATE INDEX IF NOT EXISTS idx_charges_subscription ON charges(subscription_id, created_at);
  `);
}

export function initDatabase(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH, { create: true, strict: true });
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  ensureSchema(db);

  dbInstance = db;
  return db;
}

export function getDatabase(): Database {
  if (!dbInstance) {
    throw new Error("Database has not been initialized.");
  }
  return dbInstance;
}
