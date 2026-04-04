import { expect, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";

import {
  buildCreatorAuthMessage,
  verifyCreatorAuthProof,
} from "./creator-auth";

const CREATOR_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945388cf0f0f1f5f6d3a5c7b8d57a6f4b2d2f3";
const CREATOR_ACCOUNT = privateKeyToAccount(CREATOR_PRIVATE_KEY);

test("verifyCreatorAuthProof recovers the creator wallet from a valid proof", async () => {
  const timestamp = "2026-04-04T22:57:54.000Z";
  const message = buildCreatorAuthMessage(timestamp);
  const signature = await CREATOR_ACCOUNT.signMessage({ message });

  await expect(
    verifyCreatorAuthProof(
      { message, signature },
      {
        nowMs: Date.parse("2026-04-04T22:58:00.000Z"),
        maxSkewMs: 60_000,
      },
    ),
  ).resolves.toBe(CREATOR_ACCOUNT.address.toLowerCase());
});

test("verifyCreatorAuthProof rejects a tampered signature", async () => {
  const timestamp = "2026-04-04T22:57:54.000Z";
  const message = buildCreatorAuthMessage(timestamp);
  const signature = await CREATOR_ACCOUNT.signMessage({ message });
  const tamperedSignature = `${signature.slice(0, -2)}ff` as `0x${string}`;

  await expect(
    verifyCreatorAuthProof(
      { message, signature: tamperedSignature },
      {
        nowMs: Date.parse("2026-04-04T22:58:00.000Z"),
        maxSkewMs: 60_000,
      },
    ),
  ).rejects.toThrow();
});

test("verifyCreatorAuthProof rejects stale timestamps", async () => {
  const timestamp = "2026-04-04T22:40:00.000Z";
  const message = buildCreatorAuthMessage(timestamp);
  const signature = await CREATOR_ACCOUNT.signMessage({ message });

  await expect(
    verifyCreatorAuthProof(
      { message, signature },
      {
        nowMs: Date.parse("2026-04-04T22:50:01.000Z"),
        maxSkewMs: 60_000,
      },
    ),
  ).rejects.toThrow("outside the allowed skew");
});
