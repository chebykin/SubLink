// Browser shim for Node's `node:module` used by @unlink-xyz/sdk.
// The SDK's loadEdDSA() does `createRequire(import.meta.url)("@zk-kit/eddsa-poseidon/blake-2b")`.
// We replace it with a direct ESM import of the same package's ESM entry.
import * as eddsaBlake2b from "@zk-kit/eddsa-poseidon/blake-2b";

type Require = (id: string) => unknown;

export function createRequire(_filename?: string | URL): Require {
  return (id: string) => {
    if (id === "@zk-kit/eddsa-poseidon/blake-2b") return eddsaBlake2b;
    throw new Error(`[module shim] Unsupported require(${JSON.stringify(id)})`);
  };
}
