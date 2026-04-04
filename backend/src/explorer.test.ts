import { afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import type { AccountKeys } from "@unlink-xyz/sdk";
import { privateKeyToAccount } from "viem/accounts";

import { explorerApp } from "../explorer/app";
import { setLiveSubscriptionInspectorForTests } from "../explorer/live-unlink";
import { createCharge } from "./db/charges";
import { createCreator } from "./db/creators";
import { getDatabase, initDatabase } from "./db/index";
import { createPlan } from "./db/plans";
import { createSubscription } from "./db/subscriptions";
import { serializeAccountKeys } from "./services/account-keys";
import { startServers } from "./index";

const AUTH_ACCOUNT = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945388cf0f0f1f5f6d3a5c7b8d57a6f4b2d2f3",
);

beforeAll(() => {
  initDatabase();
});

beforeEach(() => {
  const db = getDatabase();
  db.exec(`
    DELETE FROM charges;
    DELETE FROM subscriptions;
    DELETE FROM plans;
    DELETE FROM creators;
  `);
  setLiveSubscriptionInspectorForTests(null);
});

afterEach(() => {
  setLiveSubscriptionInspectorForTests(null);
});

function makeSerializedAccountKeys(unlinkAddress: string): string {
  const source: AccountKeys = {
    spendingPrivateKey: 11n,
    spendingPublicKey: [22n, 33n],
    viewingPrivateKey: new Uint8Array([1, 2, 3, 4]),
    viewingPublicKey: new Uint8Array([5, 6, 7, 8]),
    nullifyingKey: 44n,
    masterPublicKey: 55n,
    address: unlinkAddress,
  };

  return serializeAccountKeys(source);
}

function seedExplorerFixture() {
  const createdAt = new Date().toISOString();
  const creator = createCreator({
    id: crypto.randomUUID(),
    evmAddress: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`,
    unlinkAddress: `unlink1creator${crypto.randomUUID().replace(/-/g, "")}`,
    name: "Creator One",
    webhookUrl: "https://example.com/webhook",
    apiKey: "abcdef1234567890",
    createdAt,
  });

  const plan = createPlan({
    id: crypto.randomUUID(),
    creatorId: creator.id,
    name: "Pro",
    description: "Premium plan",
    amount: "1234567",
    intervalSeconds: 3600,
    spendingCap: "5000000",
    active: true,
    createdAt,
  });

  const unlinkAddress = `unlink1subscriber${crypto.randomUUID().replace(/-/g, "")}`;
  const subscription = createSubscription({
    id: crypto.randomUUID(),
    planId: plan.id,
    authKeyId: AUTH_ACCOUNT.address.toLowerCase(),
    authPublicKey: AUTH_ACCOUNT.publicKey,
    unlinkAddress,
    accountKeysEncrypted: makeSerializedAccountKeys(unlinkAddress),
    status: "active",
    totalSpent: "1234567",
    chargeCount: 1,
    consecutiveFailures: 0,
    lastChargedAt: createdAt,
    nextChargeAt: new Date(Date.now() + 3600_000).toISOString(),
    createdAt,
    cancelledAt: null,
  });

  const charge = createCharge({
    id: crypto.randomUUID(),
    subscriptionId: subscription.id,
    amount: plan.amount,
    status: "success",
    unlinkTxId: "unlink-tx-123",
    errorMessage: null,
    createdAt,
    completedAt: createdAt,
  });

  return { creator, plan, subscription, charge };
}

test.serial("startServers rejects identical API and explorer ports", () => {
  expect(() => startServers({ apiPort: 3000, explorerPort: 3000 })).toThrow(
    "PORT and EXPLORER_PORT must be different.",
  );
});

test.serial("explorer creator detail masks creator API key", async () => {
  const fixture = seedExplorerFixture();

  const response = await explorerApp.fetch(
    new Request(`http://localhost/creators/${fixture.creator.id}`),
  );

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("Creator One");
  expect(html).toContain("abcd...7890");
  expect(html).not.toContain("abcdef1234567890");
});

test.serial("explorer subscription detail masks account keys and renders live unlink data", async () => {
  const fixture = seedExplorerFixture();
  const sensitiveValue = fixture.subscription.accountKeysEncrypted;

  setLiveSubscriptionInspectorForTests(async () => ({
    usdcBalance: "7654321",
    balances: [
      {
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: "7654321",
      },
    ],
    transactions: [
      {
        id: "tx-demo-1",
        type: "transfer",
        status: "processed",
        token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        amount: "1234567",
        createdAt: new Date().toISOString(),
        rawJson: '{"txId":"tx-demo-1"}',
      },
    ],
  }));

  const response = await explorerApp.fetch(
    new Request(`http://localhost/subscriptions/${fixture.subscription.id}`),
  );

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("Live Unlink Balances");
  expect(html).toContain("7.654321 USDC");
  expect(html).toContain("tx-demo-1");
  expect(html).toContain("[redacted");
  expect(html).not.toContain(sensitiveValue);
});
