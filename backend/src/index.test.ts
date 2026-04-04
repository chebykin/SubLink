import { afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import type { AccountKeys } from "@unlink-xyz/sdk";
import {
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";

import {
  assertCriticalBackendEnv,
  MAX_CONSECUTIVE_FAILURES,
  PENDING_ACTIVATION_RETRY_SECONDS,
} from "./config";
import { listChargesBySubscriptionId } from "./db/charges";
import { createCreator } from "./db/creators";
import { getDatabase, initDatabase } from "./db/index";
import { createPlan } from "./db/plans";
import { createSubscription, getSubscriptionById } from "./db/subscriptions";
import { handleRequest } from "./router";
import {
  deserializeAccountKeys,
  serializeAccountKeys,
} from "./services/account-keys";
import {
  buildBearerMessage,
  buildSubscribeProofMessage,
  formatBearerToken,
  getAuthKeyIdFromPublicKey,
  parseBearerToken,
  requireSubscriberAuth,
  verifyBearerToken,
  verifySubscribeProof,
} from "./services/bearer-token";
import { buildCreatorAuthMessage } from "./services/creator-auth";
import {
  runChargeForSubscriptionId,
  resetSubscriptionChargeLocksForTests,
  runCronOnce,
  setTransferExecutorForTests,
} from "./services/cron";
import {
  resetAccountTransferLocksForTests,
  withAccountTransferLock,
} from "./services/unlink";
import type { SubscriptionStatus } from "./types";

const ALICE_AUTH_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945388cf0f0f1f5f6d3a5c7b8d57a6f4b2d2f3";
const BOB_AUTH_PRIVATE_KEY =
  "0x8b3a350cf5c34c9194ca4f4f1f8f5a4a7b6263aa5b6b8a3a4d0d84a2a2f9f3d1";
const ALICE_AUTH_ACCOUNT = privateKeyToAccount(ALICE_AUTH_PRIVATE_KEY);
const BOB_AUTH_ACCOUNT = privateKeyToAccount(BOB_AUTH_PRIVATE_KEY);

let originalAdminSecret: string | undefined;
let originalUnlinkApiKey: string | undefined;
let originalUnlinkApiEndpoint: string | undefined;

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

  setTransferExecutorForTests(null);
  resetSubscriptionChargeLocksForTests();
  resetAccountTransferLocksForTests();
  originalAdminSecret = Bun.env.ADMIN_SECRET;
  originalUnlinkApiKey = Bun.env.UNLINK_API_KEY;
  originalUnlinkApiEndpoint = Bun.env.UNLINK_API_ENDPOINT;
});

afterEach(() => {
  setTransferExecutorForTests(null);
  resetSubscriptionChargeLocksForTests();
  resetAccountTransferLocksForTests();

  if (originalAdminSecret === undefined) {
    delete Bun.env.ADMIN_SECRET;
  } else {
    Bun.env.ADMIN_SECRET = originalAdminSecret;
  }

  if (originalUnlinkApiKey === undefined) {
    delete Bun.env.UNLINK_API_KEY;
  } else {
    Bun.env.UNLINK_API_KEY = originalUnlinkApiKey;
  }

  if (originalUnlinkApiEndpoint === undefined) {
    delete Bun.env.UNLINK_API_ENDPOINT;
  } else {
    Bun.env.UNLINK_API_ENDPOINT = originalUnlinkApiEndpoint;
  }
});

function isoOffsetSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1_000).toISOString();
}

function makeSerializedAccountKeys(address: string): string {
  const keys: AccountKeys = {
    spendingPrivateKey: 11n,
    spendingPublicKey: [22n, 33n],
    viewingPrivateKey: new Uint8Array([1, 2, 3, 4]),
    viewingPublicKey: new Uint8Array([5, 6, 7, 8]),
    nullifyingKey: 44n,
    masterPublicKey: 55n,
    address,
  };

  return serializeAccountKeys(keys);
}

async function createBearerForAccount(
  account: PrivateKeyAccount,
  subscriptionId: string = crypto.randomUUID(),
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1_000) + 600;
  const signature = await account.signMessage({
    message: buildBearerMessage(subscriptionId, expiry),
  });

  return formatBearerToken({
    subscriptionId,
    expiry,
    signature,
  });
}

async function createCreatorProofForAccount(
  account: PrivateKeyAccount,
  timestamp = new Date().toISOString(),
): Promise<{ message: string; signature: `0x${string}` }> {
  const message = buildCreatorAuthMessage(timestamp);
  const signature = await account.signMessage({ message });
  return { message, signature };
}

function createCreatorPlanFixture(params?: {
  amount?: string;
  intervalSeconds?: number;
  spendingCap?: string;
  active?: boolean;
}) {
  const createdAt = new Date().toISOString();
  const creator = createCreator({
    id: crypto.randomUUID(),
    evmAddress: `0x${crypto
      .randomUUID()
      .replace(/-/g, "")
      .padEnd(40, "a")
      .slice(0, 40)}`,
    unlinkAddress: `unlink1creator${crypto.randomUUID().replace(/-/g, "")}`,
    name: "Creator",
    apiKey: `api-${crypto.randomUUID()}`,
    createdAt,
  });

  const plan = createPlan({
    id: crypto.randomUUID(),
    creatorId: creator.id,
    name: "Plan",
    description: "",
    amount: params?.amount ?? "1000",
    intervalSeconds: params?.intervalSeconds ?? 60,
    spendingCap: params?.spendingCap ?? "0",
    active: params?.active ?? true,
    createdAt,
  });

  return { creator, plan, createdAt };
}

async function postSubscribe(params: {
  planId: string;
  unlinkAddress?: string;
  authAccount?: PrivateKeyAccount;
  authKeyId?: string;
  authPublicKey?: `0x${string}`;
  authProof?: `0x${string}`;
  accountKeysJson?: string;
}) {
  const authAccount = params.authAccount ?? ALICE_AUTH_ACCOUNT;
  const unlinkAddress =
    params.unlinkAddress ?? `unlink1sub${crypto.randomUUID().replace(/-/g, "")}`;
  const authKeyId = params.authKeyId ?? authAccount.address.toLowerCase();
  const authPublicKey = params.authPublicKey ?? authAccount.publicKey;
  const authProof =
    params.authProof ??
    (await authAccount.signMessage({
      message: buildSubscribeProofMessage(params.planId, unlinkAddress, authKeyId),
    }));
  const accountKeysJson =
    params.accountKeysJson ?? makeSerializedAccountKeys(unlinkAddress);

  const requestBody = {
    planId: params.planId,
    unlinkAddress,
    accountKeysJson,
    authKeyId,
    authPublicKey,
    authProof,
  };

  const response = await handleRequest(
    new Request("http://localhost/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }),
  );

  return {
    response,
    requestBody,
  };
}

function createSubscriptionFixture(params?: {
  amount?: string;
  spendingCap?: string;
  totalSpent?: string;
  consecutiveFailures?: number;
  lastChargedAt?: string | null;
  paidThroughAt?: string | null;
  nextChargeAt?: string;
  status?: SubscriptionStatus;
  chargeCount?: number;
  authAccount?: PrivateKeyAccount;
  authKeyId?: string;
  authPublicKey?: `0x${string}`;
  unlinkAddress?: string;
  accountKeysEncrypted?: string;
}) {
  const { creator, plan, createdAt } = createCreatorPlanFixture({
    amount: params?.amount,
    intervalSeconds: 60,
    spendingCap: params?.spendingCap,
    active: true,
  });

  const authAccount = params?.authAccount ?? ALICE_AUTH_ACCOUNT;
  const unlinkAddress =
    params?.unlinkAddress ?? `unlink1sub${crypto.randomUUID().replace(/-/g, "")}`;

  const subscription = createSubscription({
    id: crypto.randomUUID(),
    planId: plan.id,
    authKeyId: params?.authKeyId ?? authAccount.address.toLowerCase(),
    authPublicKey: params?.authPublicKey ?? authAccount.publicKey,
    unlinkAddress,
    accountKeysEncrypted:
      params?.accountKeysEncrypted ?? makeSerializedAccountKeys(unlinkAddress),
    status: params?.status ?? "active",
    totalSpent: params?.totalSpent ?? "0",
    chargeCount: params?.chargeCount ?? 0,
    consecutiveFailures: params?.consecutiveFailures ?? 0,
    lastChargedAt: params?.lastChargedAt ?? null,
    paidThroughAt: params?.paidThroughAt ?? null,
    nextChargeAt: params?.nextChargeAt ?? isoOffsetSeconds(-60),
    createdAt,
    cancelledAt: null,
  });

  return { creator, plan, subscription, authAccount };
}

test.serial("account key serialization round-trips bigint and bytes fields", () => {
  const source: AccountKeys = {
    spendingPrivateKey: 11n,
    spendingPublicKey: [22n, 33n],
    viewingPrivateKey: new Uint8Array([1, 2, 3, 4]),
    viewingPublicKey: new Uint8Array([5, 6, 7, 8]),
    nullifyingKey: 44n,
    masterPublicKey: 55n,
    address: "unlink1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
  };

  const serialized = serializeAccountKeys(source);
  const restored = deserializeAccountKeys(serialized);

  expect(restored.spendingPrivateKey).toBe(source.spendingPrivateKey);
  expect(restored.spendingPublicKey).toEqual(source.spendingPublicKey);
  expect([...restored.viewingPrivateKey]).toEqual([...source.viewingPrivateKey]);
  expect([...restored.viewingPublicKey]).toEqual([...source.viewingPublicKey]);
  expect(restored.nullifyingKey).toBe(source.nullifyingKey);
  expect(restored.masterPublicKey).toBe(source.masterPublicKey);
  expect(restored.address).toBe(source.address);
});

test.serial("backend startup config rejects missing critical Unlink env vars", () => {
  delete Bun.env.UNLINK_API_KEY;
  delete Bun.env.UNLINK_API_ENDPOINT;

  expect(() => assertCriticalBackendEnv()).toThrow(
    "Missing required backend environment variable(s): UNLINK_API_KEY, UNLINK_API_ENDPOINT",
  );
});

test.serial("subscribe proof verification accepts matching auth key", async () => {
  const authKeyId = ALICE_AUTH_ACCOUNT.address.toLowerCase();
  const authProof = await ALICE_AUTH_ACCOUNT.signMessage({
    message: buildSubscribeProofMessage("plan-123", "unlink1subscriber", authKeyId),
  });

  await expect(
    verifySubscribeProof({
      planId: "plan-123",
      unlinkAddress: "unlink1subscriber",
      authKeyId,
      authPublicKey: ALICE_AUTH_ACCOUNT.publicKey,
      authProof,
    }),
  ).resolves.toBe(authKeyId);

  expect(getAuthKeyIdFromPublicKey(ALICE_AUTH_ACCOUNT.publicKey)).toBe(authKeyId);
});

test.serial("POST /creators creates a creator from the recovered wallet proof", async () => {
  const proof = await createCreatorProofForAccount(ALICE_AUTH_ACCOUNT);

  const response = await handleRequest(
    new Request("http://localhost/creators", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Alice Creator",
        unlinkAddress: "unlink1creatoralice",
        proof,
      }),
    }),
  );

  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    id: string;
    apiKey: string;
  };
  expect(body.id).toBeString();
  expect(body.apiKey).toBeString();

  const revealResponse = await handleRequest(
    new Request("http://localhost/creators/reveal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        proof: await createCreatorProofForAccount(ALICE_AUTH_ACCOUNT),
      }),
    }),
  );

  expect(revealResponse.status).toBe(200);
  const revealed = (await revealResponse.json()) as {
    id: string;
    apiKey: string;
    evmAddress: string;
  };

  expect(revealed.id).toBe(body.id);
  expect(revealed.apiKey).toBe(body.apiKey);
  expect(revealed.evmAddress).toBe(ALICE_AUTH_ACCOUNT.address.toLowerCase());
});

test.serial("POST /creators/reveal returns 404 when the wallet is not registered", async () => {
  const response = await handleRequest(
    new Request("http://localhost/creators/reveal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        proof: await createCreatorProofForAccount(BOB_AUTH_ACCOUNT),
      }),
    }),
  );

  expect(response.status).toBe(404);
});

test.serial("POST /creators/reveal returns 401 for stale creator proofs", async () => {
  const proof = await createCreatorProofForAccount(
    ALICE_AUTH_ACCOUNT,
    "2026-04-04T22:00:00.000Z",
  );

  const response = await handleRequest(
    new Request("http://localhost/creators/reveal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ proof }),
    }),
  );

  expect(response.status).toBe(401);
});

test.serial("POST /creators/reveal returns 401 for tampered creator proofs", async () => {
  const proof = await createCreatorProofForAccount(ALICE_AUTH_ACCOUNT);
  const tamperedProof = {
    ...proof,
    signature: `${proof.signature.slice(0, -2)}ff` as `0x${string}`,
  };

  const response = await handleRequest(
    new Request("http://localhost/creators/reveal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ proof: tamperedProof }),
    }),
  );

  expect(response.status).toBe(401);
});

test.serial("POST /creators rejects missing proofs", async () => {
  const response = await handleRequest(
    new Request("http://localhost/creators", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Alice Creator",
        unlinkAddress: "unlink1creatoralice",
      }),
    }),
  );

  expect(response.status).toBe(400);
});

test.serial("bearer token parsing validates format", () => {
  expect(() => parseBearerToken("invalid-token")).toThrow();
  expect(() => parseBearerToken("subId..0x1234")).toThrow();
});

test.serial("bearer token parser accepts compact signatures", () => {
  const token = `sub-id.1700000000.0x${"a".repeat(128)}`;
  const parsed = parseBearerToken(token);
  expect(parsed.subscriptionId).toBe("sub-id");
});

test.serial("bearer token verification recovers auth key id", async () => {
  const subscriptionId = crypto.randomUUID();
  const expiry = Math.floor(Date.now() / 1000) + 600;
  const signature = await ALICE_AUTH_ACCOUNT.signMessage({
    message: buildBearerMessage(subscriptionId, expiry),
  });

  const token = formatBearerToken({
    subscriptionId,
    expiry,
    signature,
  });

  const verified = await verifyBearerToken(token);
  expect(verified.payload.subscriptionId).toBe(subscriptionId);
  expect(verified.authKeyId).toBe(ALICE_AUTH_ACCOUNT.address.toLowerCase());
});

test.serial("bearer token verification rejects expired tokens", async () => {
  const subscriptionId = crypto.randomUUID();
  const expiry = Math.floor(Date.now() / 1000) - 600;
  const signature = await ALICE_AUTH_ACCOUNT.signMessage({
    message: buildBearerMessage(subscriptionId, expiry),
  });
  const token = formatBearerToken({ subscriptionId, expiry, signature });

  await expect(verifyBearerToken(token)).rejects.toThrow("expired");
});

test.serial("bearer token verification rejects tokens too far in future", async () => {
  const subscriptionId = crypto.randomUUID();
  const expiry = Math.floor(Date.now() / 1000) + 900_000;
  const signature = await ALICE_AUTH_ACCOUNT.signMessage({
    message: buildBearerMessage(subscriptionId, expiry),
  });
  const token = formatBearerToken({ subscriptionId, expiry, signature });

  await expect(verifyBearerToken(token)).rejects.toThrow("max allowed age");
});

test.serial("POST /subscribe accepts auth proof and stores auth identity", async () => {
  const { plan } = createCreatorPlanFixture();

  setTransferExecutorForTests(async () => ({
    status: "success",
    txId: "mock-first-charge",
    errorMessage: null,
  }));

  const { response, requestBody } = await postSubscribe({
    planId: plan.id,
  });

  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    subscriptionId: string;
    firstCharge: { txId: string | null; status: string };
  };
  expect(body.firstCharge.txId).toBe("mock-first-charge");
  expect(body.firstCharge.status).toBe("success");

  const stored = getSubscriptionById(body.subscriptionId);
  expect(stored?.authKeyId).toBe(requestBody.authKeyId);
  expect(stored?.authPublicKey).toBe(requestBody.authPublicKey);
  expect(stored?.status).toBe("active");
  expect(stored?.chargeCount).toBe(1);
  expect(stored?.paidThroughAt).not.toBeNull();
});

test.serial("POST /subscribe returns 402 and leaves subscription pending when initial charge fails", async () => {
  const { plan } = createCreatorPlanFixture();

  setTransferExecutorForTests(async () => ({
    status: "failed",
    txId: null,
    errorMessage: "mock transfer failure",
  }));

  const { response } = await postSubscribe({
    planId: plan.id,
  });

  expect(response.status).toBe(402);
  const body = (await response.json()) as {
    error: string;
    details: {
      subscriptionId: string;
      firstCharge: { status: string; errorMessage: string | null };
    };
  };
  expect(body.error).toContain("Initial charge failed");
  expect(body.details.firstCharge.status).toBe("failed");

  const stored = getSubscriptionById(body.details.subscriptionId);
  expect(stored?.status).toBe("pending_activation");
  expect(stored?.paidThroughAt).toBeNull();
  expect(stored?.chargeCount).toBe(0);
  expect(stored?.nextChargeAt).not.toBeNull();
  if (stored?.nextChargeAt) {
    const retryDelaySeconds = Math.round(
      (Date.parse(stored.nextChargeAt) - Date.now()) / 1_000,
    );
    expect(retryDelaySeconds).toBeLessThanOrEqual(PENDING_ACTIVATION_RETRY_SECONDS + 1);
  }
});

test.serial("POST /subscribe retries an existing pending activation row instead of returning 409", async () => {
  const { plan } = createCreatorPlanFixture();

  setTransferExecutorForTests(async () => ({
    status: "failed",
    txId: null,
    errorMessage: "mock transfer failure",
  }));

  const first = await postSubscribe({ planId: plan.id });
  expect(first.response.status).toBe(402);
  const firstBody = (await first.response.json()) as {
    details: { subscriptionId: string };
  };

  setTransferExecutorForTests(async () => ({
    status: "success",
    txId: "mock-retry-success",
    errorMessage: null,
  }));

  const second = await postSubscribe({
    planId: plan.id,
    unlinkAddress: first.requestBody.unlinkAddress,
    authKeyId: first.requestBody.authKeyId,
    authPublicKey: first.requestBody.authPublicKey,
    authProof: first.requestBody.authProof,
    accountKeysJson: first.requestBody.accountKeysJson,
  });

  expect(second.response.status).toBe(201);
  const secondBody = (await second.response.json()) as {
    subscriptionId: string;
    firstCharge: { txId: string | null; status: string };
  };
  expect(secondBody.subscriptionId).toBe(firstBody.details.subscriptionId);
  expect(secondBody.firstCharge.txId).toBe("mock-retry-success");
  expect(secondBody.firstCharge.status).toBe("success");

  const stored = getSubscriptionById(secondBody.subscriptionId);
  expect(stored?.status).toBe("active");
  expect(stored?.chargeCount).toBe(1);
  expect(stored?.paidThroughAt).not.toBeNull();
});

test.serial("POST /subscribe rejects authProof signed by a different auth key", async () => {
  const { plan } = createCreatorPlanFixture();
  const unlinkAddress = `unlink1sub${crypto.randomUUID().replace(/-/g, "")}`;
  const authKeyId = ALICE_AUTH_ACCOUNT.address.toLowerCase();
  const invalidAuthProof = await BOB_AUTH_ACCOUNT.signMessage({
    message: buildSubscribeProofMessage(plan.id, unlinkAddress, authKeyId),
  });

  const { response } = await postSubscribe({
    planId: plan.id,
    unlinkAddress,
    authKeyId,
    authPublicKey: ALICE_AUTH_ACCOUNT.publicKey,
    authProof: invalidAuthProof,
  });

  expect(response.status).toBe(400);
  const body = (await response.json()) as { error: string };
  expect(body.error).toContain("authProof signature does not match authKeyId");
});

test.serial("POST /subscribe rejects mismatched authPublicKey and authKeyId", async () => {
  const { plan } = createCreatorPlanFixture();
  const unlinkAddress = `unlink1sub${crypto.randomUUID().replace(/-/g, "")}`;
  const authKeyId = ALICE_AUTH_ACCOUNT.address.toLowerCase();
  const mismatchedProof = await BOB_AUTH_ACCOUNT.signMessage({
    message: buildSubscribeProofMessage(plan.id, unlinkAddress, authKeyId),
  });

  const { response } = await postSubscribe({
    planId: plan.id,
    unlinkAddress,
    authKeyId,
    authPublicKey: BOB_AUTH_ACCOUNT.publicKey,
    authProof: mismatchedProof,
  });

  expect(response.status).toBe(400);
  const body = (await response.json()) as { error: string };
  expect(body.error).toContain("authPublicKey does not match authKeyId");
});

test.serial("POST /subscribe returns 409 for duplicate subscription on the same plan", async () => {
  const { plan } = createCreatorPlanFixture();

  setTransferExecutorForTests(async () => ({
    status: "success",
    txId: "mock-first-charge",
    errorMessage: null,
  }));

  const first = await postSubscribe({ planId: plan.id });
  expect(first.response.status).toBe(201);

  const second = await postSubscribe({ planId: plan.id });
  expect(second.response.status).toBe(409);
  const body = (await second.response.json()) as { error: string };
  expect(body.error).toContain("Subscription already exists");
});

test.serial("double-charge guard: runCronOnce skips subscriptions whose nextChargeAt is in the future", async () => {
  const fixture = createSubscriptionFixture({
    nextChargeAt: isoOffsetSeconds(3_600),
  });

  setTransferExecutorForTests(async () => {
    throw new Error("transfer should not be called for non-due subscriptions");
  });

  const summary = await runCronOnce();
  expect(summary.attempted).toBe(0);
  expect(summary.succeeded).toBe(0);
  expect(summary.failed).toBe(0);
  expect(listChargesBySubscriptionId(fixture.subscription.id)).toHaveLength(0);
});

test.serial("key stripping: /subscriptions response never exposes accountKeysEncrypted", async () => {
  const fixture = createSubscriptionFixture({
    accountKeysEncrypted: '{"very":"sensitive"}',
  });
  const token = await createBearerForAccount(fixture.authAccount);

  const response = await handleRequest(
    new Request("http://localhost/subscriptions", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
      },
    }),
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    subscriptions: Array<Record<string, unknown>>;
  };
  expect(body.subscriptions).toHaveLength(1);
  expect(body.subscriptions[0]?.id).toBe(fixture.subscription.id);
  expect("accountKeysEncrypted" in (body.subscriptions[0] ?? {})).toBe(false);
});

test.serial("spending cap completion: subscription becomes completed after successful cap-reaching charge", async () => {
  const fixture = createSubscriptionFixture({
    amount: "200",
    spendingCap: "1000",
    totalSpent: "900",
    chargeCount: 1,
    lastChargedAt: isoOffsetSeconds(-120),
    paidThroughAt: isoOffsetSeconds(-10),
    nextChargeAt: isoOffsetSeconds(-10),
  });

  setTransferExecutorForTests(async () => ({
    status: "success",
    txId: "mock-success-tx",
    errorMessage: null,
  }));

  const result = await runChargeForSubscriptionId(fixture.subscription.id);
  expect(result.outcome).toBe("success");
  expect(result.subscription.status).toBe("completed");
  expect(result.subscription.totalSpent).toBe("1100");
  expect(result.subscription.cancelledAt).not.toBeNull();
});

test.serial("failed renewal moves subscription to past_due without extending entitlement", async () => {
  const paidThroughAt = isoOffsetSeconds(-10);
  const fixture = createSubscriptionFixture({
    chargeCount: 1,
    lastChargedAt: isoOffsetSeconds(-120),
    paidThroughAt,
    nextChargeAt: paidThroughAt,
  });

  setTransferExecutorForTests(async () => ({
    status: "failed",
    txId: null,
    errorMessage: "mock renewal failure",
  }));

  const result = await runChargeForSubscriptionId(fixture.subscription.id);
  expect(result.outcome).toBe("failed");
  expect(result.subscription.status).toBe("past_due");
  expect(result.subscription.paidThroughAt).toBe(paidThroughAt);
  expect(result.subscription.chargeCount).toBe(1);
});

test.serial("3-failure auto-cancel: subscription is cancelled_by_failure on MAX-th failed charge", async () => {
  const fixture = createSubscriptionFixture({
    consecutiveFailures: MAX_CONSECUTIVE_FAILURES - 1,
    chargeCount: 1,
    lastChargedAt: isoOffsetSeconds(-120),
    paidThroughAt: isoOffsetSeconds(-10),
    nextChargeAt: isoOffsetSeconds(-10),
  });

  setTransferExecutorForTests(async () => ({
    status: "failed",
    txId: null,
    errorMessage: "mock transfer failure",
  }));

  const result = await runChargeForSubscriptionId(fixture.subscription.id);
  expect(result.outcome).toBe("failed");
  expect(result.subscription.status).toBe("cancelled_by_failure");
  expect(result.subscription.consecutiveFailures).toBe(MAX_CONSECUTIVE_FAILURES);
  expect(result.subscription.cancelledAt).not.toBeNull();
});

test.serial("transfer lock serialization: same account tasks run sequentially", async () => {
  const events: string[] = [];
  let active = 0;
  let maxActive = 0;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const first = withAccountTransferLock("unlink1sameaddress", async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    events.push("first:start");
    await sleep(40);
    events.push("first:end");
    active -= 1;
  });

  const second = withAccountTransferLock("unlink1sameaddress", async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    events.push("second:start");
    await sleep(10);
    events.push("second:end");
    active -= 1;
  });

  await Promise.all([first, second]);
  expect(maxActive).toBe(1);
  expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
});

test.serial("401 on subscriber endpoints without bearer token", async () => {
  const fixture = createSubscriptionFixture();
  const responses = await Promise.all([
    handleRequest(new Request("http://localhost/subscriptions", { method: "GET" })),
    handleRequest(
      new Request(`http://localhost/charges/${fixture.subscription.id}`, {
        method: "GET",
      }),
    ),
    handleRequest(
      new Request(`http://localhost/subscriptions/${fixture.subscription.id}`, {
        method: "DELETE",
      }),
    ),
  ]);

  for (const response of responses) {
    expect(response.status).toBe(401);
  }
});

test.serial("403 on DELETE /subscriptions/:id with wrong subscriber bearer token", async () => {
  const fixture = createSubscriptionFixture({
    authAccount: ALICE_AUTH_ACCOUNT,
  });
  const wrongToken = await createBearerForAccount(BOB_AUTH_ACCOUNT);

  const response = await handleRequest(
    new Request(`http://localhost/subscriptions/${fixture.subscription.id}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${wrongToken}`,
      },
    }),
  );

  expect(response.status).toBe(403);
  const reloaded = getSubscriptionById(fixture.subscription.id);
  expect(reloaded?.status).toBe("active");
});

test.serial("403 on GET /charges/:subscriptionId with wrong subscriber bearer token", async () => {
  const fixture = createSubscriptionFixture({
    authAccount: ALICE_AUTH_ACCOUNT,
  });
  const wrongToken = await createBearerForAccount(BOB_AUTH_ACCOUNT);

  const response = await handleRequest(
    new Request(`http://localhost/charges/${fixture.subscription.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${wrongToken}`,
      },
    }),
  );

  expect(response.status).toBe(403);
});

test.serial("GET /verify returns valid response without subscriber wallet address", async () => {
  const fixture = createSubscriptionFixture({
    authAccount: ALICE_AUTH_ACCOUNT,
    chargeCount: 1,
    lastChargedAt: isoOffsetSeconds(-120),
    paidThroughAt: isoOffsetSeconds(3_600),
    nextChargeAt: isoOffsetSeconds(3_600),
  });
  const token = await createBearerForAccount(
    ALICE_AUTH_ACCOUNT,
    fixture.subscription.id,
  );

  const response = await handleRequest(
    new Request(`http://localhost/verify/${fixture.plan.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": fixture.creator.apiKey,
      },
    }),
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body.valid).toBe(true);
  expect(body.subscriptionId).toBe(fixture.subscription.id);
  expect(body.planId).toBe(fixture.plan.id);
  expect("subscriberEvmAddress" in body).toBe(false);
});

test.serial("GET /verify denies subscriptions without a successful charge entitlement", async () => {
  const fixture = createSubscriptionFixture({
    authAccount: ALICE_AUTH_ACCOUNT,
    status: "pending_activation",
    chargeCount: 0,
    paidThroughAt: null,
  });
  const token = await createBearerForAccount(
    ALICE_AUTH_ACCOUNT,
    fixture.subscription.id,
  );

  const response = await handleRequest(
    new Request(`http://localhost/verify/${fixture.plan.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": fixture.creator.apiKey,
      },
    }),
  );

  expect(response.status).toBe(402);
  const body = (await response.json()) as { valid: boolean; error: string };
  expect(body.valid).toBe(false);
  expect(body.error).toBe("Subscription required");
});

test.serial("GET /verify still allows cancelled subscriptions until paidThroughAt", async () => {
  const fixture = createSubscriptionFixture({
    authAccount: ALICE_AUTH_ACCOUNT,
    status: "cancelled",
    chargeCount: 1,
    lastChargedAt: isoOffsetSeconds(-120),
    paidThroughAt: isoOffsetSeconds(3_600),
    nextChargeAt: isoOffsetSeconds(3_600),
  });
  const token = await createBearerForAccount(
    ALICE_AUTH_ACCOUNT,
    fixture.subscription.id,
  );

  const response = await handleRequest(
    new Request(`http://localhost/verify/${fixture.plan.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "x-api-key": fixture.creator.apiKey,
      },
    }),
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as { valid: boolean };
  expect(body.valid).toBe(true);
});

test.serial("403 on /admin/run-cron without admin key", async () => {
  Bun.env.ADMIN_SECRET = "test-admin-secret";

  const response = await handleRequest(
    new Request("http://localhost/admin/run-cron", { method: "POST" }),
  );

  expect(response.status).toBe(403);
});

test.serial("200 on /admin/run-cron with valid admin key", async () => {
  Bun.env.ADMIN_SECRET = "test-admin-secret";

  const response = await handleRequest(
    new Request("http://localhost/admin/run-cron", {
      method: "POST",
      headers: {
        "x-admin-key": "test-admin-secret",
      },
    }),
  );

  expect(response.status).toBe(200);
  const body = (await response.json()) as {
    attempted: number;
    skippedBecauseRunning: boolean;
  };
  expect(body.attempted).toBe(0);
  expect(body.skippedBecauseRunning).toBe(false);
});

test.serial("requireSubscriberAuth rejects missing bearer header", async () => {
  await expect(
    requireSubscriberAuth(new Request("http://localhost/subscriptions", { method: "GET" })),
  ).rejects.toThrow("Missing bearer token.");
});
