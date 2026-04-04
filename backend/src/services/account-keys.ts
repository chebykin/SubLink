import type { AccountKeys } from "@unlink-xyz/sdk";

import type { SerializedAccountKeys } from "../types";

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

function hexToBytes(value: string, fieldName: string): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;

  if (normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    throw new Error(`Invalid hex in ${fieldName}.`);
  }

  return new Uint8Array(Buffer.from(normalized, "hex"));
}

function decimalToBigInt(value: string, fieldName: string): bigint {
  if (!/^-?[0-9]+$/.test(value)) {
    throw new Error(`Invalid decimal bigint in ${fieldName}.`);
  }
  return BigInt(value);
}

function assertSerializedAccountKeys(value: unknown): SerializedAccountKeys {
  if (!value || typeof value !== "object") {
    throw new Error("Serialized account keys must be an object.");
  }

  const keys = value as Partial<SerializedAccountKeys>;

  if (
    typeof keys.spendingPrivateKey !== "string" ||
    !Array.isArray(keys.spendingPublicKey) ||
    keys.spendingPublicKey.length !== 2 ||
    typeof keys.spendingPublicKey[0] !== "string" ||
    typeof keys.spendingPublicKey[1] !== "string" ||
    typeof keys.viewingPrivateKey !== "string" ||
    typeof keys.viewingPublicKey !== "string" ||
    typeof keys.nullifyingKey !== "string" ||
    typeof keys.masterPublicKey !== "string" ||
    typeof keys.address !== "string"
  ) {
    throw new Error("Serialized account keys are missing required fields.");
  }

  return keys as SerializedAccountKeys;
}

export function serializeAccountKeysToObject(keys: AccountKeys): SerializedAccountKeys {
  return {
    spendingPrivateKey: keys.spendingPrivateKey.toString(10),
    spendingPublicKey: [
      keys.spendingPublicKey[0].toString(10),
      keys.spendingPublicKey[1].toString(10),
    ],
    viewingPrivateKey: bytesToHex(keys.viewingPrivateKey),
    viewingPublicKey: bytesToHex(keys.viewingPublicKey),
    nullifyingKey: keys.nullifyingKey.toString(10),
    masterPublicKey: keys.masterPublicKey.toString(10),
    address: keys.address,
  };
}

export function serializeAccountKeys(keys: AccountKeys): string {
  return JSON.stringify(serializeAccountKeysToObject(keys));
}

export function deserializeAccountKeys(serialized: string): AccountKeys {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("accountKeysJson must be valid JSON.");
  }

  const safe = assertSerializedAccountKeys(parsed);

  return {
    spendingPrivateKey: decimalToBigInt(
      safe.spendingPrivateKey,
      "spendingPrivateKey",
    ),
    spendingPublicKey: [
      decimalToBigInt(safe.spendingPublicKey[0], "spendingPublicKey[0]"),
      decimalToBigInt(safe.spendingPublicKey[1], "spendingPublicKey[1]"),
    ],
    viewingPrivateKey: hexToBytes(safe.viewingPrivateKey, "viewingPrivateKey"),
    viewingPublicKey: hexToBytes(safe.viewingPublicKey, "viewingPublicKey"),
    nullifyingKey: decimalToBigInt(safe.nullifyingKey, "nullifyingKey"),
    masterPublicKey: decimalToBigInt(safe.masterPublicKey, "masterPublicKey"),
    address: safe.address,
  };
}
