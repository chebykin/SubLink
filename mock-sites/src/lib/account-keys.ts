import type { AccountKeys } from "@unlink-xyz/sdk";

export interface SerializedAccountKeys {
  spendingPrivateKey: string;
  spendingPublicKey: [string, string];
  viewingPrivateKey: string;
  viewingPublicKey: string;
  nullifyingKey: string;
  masterPublicKey: string;
  address: string;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] as number).toString(16).padStart(2, "0");
  }
  return `0x${hex}`;
}

export function serializeAccountKeys(keys: AccountKeys): string {
  const payload: SerializedAccountKeys = {
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

  return JSON.stringify(payload);
}
