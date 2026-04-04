import { getDatabase } from "./index";
import type { Creator, CreatorPublic } from "../types";

interface CreatorRow {
  id: string;
  evm_address: string;
  unlink_address: string;
  name: string;
  webhook_url: string | null;
  api_key: string;
  created_at: string;
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

export function toPublicCreator(creator: Creator): CreatorPublic {
  return {
    id: creator.id,
    evmAddress: creator.evmAddress,
    unlinkAddress: creator.unlinkAddress,
    name: creator.name,
    webhookUrl: creator.webhookUrl,
    createdAt: creator.createdAt,
  };
}

export function createCreator(params: {
  id: string;
  evmAddress: string;
  unlinkAddress: string;
  name: string;
  webhookUrl?: string;
  apiKey: string;
  createdAt: string;
}): Creator {
  const db = getDatabase();

  db.prepare(
    `
      INSERT INTO creators (
        id, evm_address, unlink_address, name, webhook_url, api_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    params.id,
    params.evmAddress,
    params.unlinkAddress,
    params.name,
    params.webhookUrl ?? null,
    params.apiKey,
    params.createdAt,
  );

  const created = getCreatorById(params.id);
  if (!created) {
    throw new Error("Failed to load creator after insert.");
  }
  return created;
}

export function getCreatorById(id: string): Creator | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM creators WHERE id = ? LIMIT 1`)
    .get(id) as CreatorRow | null;

  return row ? mapCreator(row) : null;
}

export function getCreatorByApiKey(apiKey: string): Creator | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM creators WHERE api_key = ? LIMIT 1`)
    .get(apiKey) as CreatorRow | null;

  return row ? mapCreator(row) : null;
}

export function getCreatorByEvmAddress(evmAddress: string): Creator | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM creators WHERE evm_address = ? LIMIT 1`)
    .get(evmAddress) as CreatorRow | null;

  return row ? mapCreator(row) : null;
}
