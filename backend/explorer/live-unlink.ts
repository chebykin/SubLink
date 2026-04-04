import { logWarn } from "../src/log";
import {
  USDC_ADDRESS,
} from "../src/config";
import {
  createUnlinkClientFromSerializedKeys,
  findTokenBalance,
} from "../src/services/unlink";

export interface ExplorerLiveTransaction {
  id: string;
  type: string | null;
  status: string | null;
  token: string | null;
  amount: string | null;
  createdAt: string | null;
  rawJson: string;
}

export interface ExplorerLiveSubscriptionSnapshot {
  usdcBalance: string;
  balances: Array<{ token: string; amount: string }>;
  transactions: ExplorerLiveTransaction[];
}

type LiveInspector = (
  accountKeysJson: string,
) => Promise<ExplorerLiveSubscriptionSnapshot>;

function normalizeMaybeString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

function normalizeTransaction(raw: unknown, index: number): ExplorerLiveTransaction {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id =
    normalizeMaybeString(record.txId) ??
    normalizeMaybeString(record.id) ??
    normalizeMaybeString(record.hash) ??
    `tx-${index + 1}`;

  return {
    id,
    type: normalizeMaybeString(record.type),
    status:
      normalizeMaybeString(record.status) ?? normalizeMaybeString(record.state),
    token:
      normalizeMaybeString(record.token) ?? normalizeMaybeString(record.tokenAddress),
    amount: normalizeMaybeString(record.amount),
    createdAt:
      normalizeMaybeString(record.createdAt) ??
      normalizeMaybeString(record.created_at) ??
      normalizeMaybeString(record.timestamp),
    rawJson: JSON.stringify(record, null, 2),
  };
}

async function readLiveSubscriptionSnapshotImpl(
  accountKeysJson: string,
): Promise<ExplorerLiveSubscriptionSnapshot> {
  const unlink = createUnlinkClientFromSerializedKeys(accountKeysJson);
  const [{ balances }, { transactions }] = await Promise.all([
    unlink.getBalances(),
    unlink.getTransactions({ limit: 10 }),
  ]);

  return {
    usdcBalance: findTokenBalance(balances, USDC_ADDRESS),
    balances: balances.map((entry) => ({
      token: entry.token,
      amount: entry.amount,
    })),
    transactions: (transactions ?? []).map((transaction, index) =>
      normalizeTransaction(transaction, index),
    ),
  };
}

let liveInspector: LiveInspector = readLiveSubscriptionSnapshotImpl;

export function setLiveSubscriptionInspectorForTests(
  inspector: LiveInspector | null,
): void {
  liveInspector = inspector ?? readLiveSubscriptionSnapshotImpl;
}

export async function readLiveSubscriptionSnapshot(params: {
  subscriptionId: string;
  accountKeysJson: string;
}): Promise<ExplorerLiveSubscriptionSnapshot | null> {
  try {
    return await liveInspector(params.accountKeysJson);
  } catch (error) {
    logWarn("explorer.unlink.read_failed", {
      subscriptionId: params.subscriptionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
