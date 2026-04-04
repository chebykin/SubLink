import { computed, ref } from "vue";

import { ApiError, createCreator, revealCreator } from "../lib/api";
import { createCreatorProof } from "../lib/creator-auth";
import type { CreatorWithKey } from "../lib/types";

const STORAGE_KEY = "sublink-creator";
const stored = ref<CreatorWithKey | null>(null);

let didCleanLegacyStorage = false;
let activeLoadToken = 0;

function cleanupLegacyStorage() {
  if (didCleanLegacyStorage || typeof window === "undefined") {
    return;
  }

  didCleanLegacyStorage = true;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup for the old persisted creator session.
  }
}

cleanupLegacyStorage();

function syncStoredCreator(creator: CreatorWithKey) {
  const current = stored.value;
  if (
    current === null ||
    current.id === creator.id ||
    current.evmAddress === creator.evmAddress
  ) {
    stored.value = creator;
  }
}

export function useCreator() {
  cleanupLegacyStorage();

  const creatorId = computed(() => stored.value?.id ?? null);
  const apiKey = computed(() => stored.value?.apiKey ?? null);
  const isRegistered = computed(() => stored.value !== null);

  async function loadFromWallet(
    signMessage: (message: string) => Promise<`0x${string}`>,
    proofOverride?: Awaited<ReturnType<typeof createCreatorProof>>,
  ): Promise<CreatorWithKey | null> {
    const loadToken = ++activeLoadToken;
    const proof = proofOverride ?? await createCreatorProof(signMessage);

    try {
      const creator = await revealCreator(proof);
      if (loadToken === activeLoadToken) {
        syncStoredCreator(creator);
      }
      return creator;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        if (loadToken === activeLoadToken) {
          stored.value = null;
        }
        return null;
      }
      throw error;
    }
  }

  async function signIn(
    signMessage: (message: string) => Promise<`0x${string}`>,
    evmAddress: string,
  ): Promise<CreatorWithKey> {
    const proof = await createCreatorProof(signMessage);

    // 1. Try to reveal existing creator.
    const existing = await loadFromWallet(signMessage, proof);
    if (existing) {
      return existing;
    }

    // 2. No creator for this wallet yet — auto-create with a default name
    //    (user can rename later). Reuses the same proof so no extra signature.
    //    unlinkAddress is unique-per-wallet until the real Unlink SDK
    //    derivation is wired in; the DB has UNIQUE(unlink_address), so a
    //    shared literal would 409 every second wallet.
    const defaultName = `Creator ${evmAddress.slice(2, 8)}`;
    const unlinkPlaceholder = `unlink1placeholder-${evmAddress.slice(2).toLowerCase()}`;
    try {
      await createCreator({
        name: defaultName,
        unlinkAddress: unlinkPlaceholder,
        proof,
      });
    } catch (error) {
      // Another tab/device created it between the reveal and the create.
      if (!(error instanceof ApiError) || error.status !== 409) {
        throw error;
      }
    }

    // 3. Fetch the full record (with apiKey) for the freshly-created creator.
    const creator = await loadFromWallet(signMessage, proof);
    if (!creator) {
      throw new Error(
        "Creator account was created, but the profile refresh still needs a retry.",
      );
    }

    syncStoredCreator(creator);
    return creator;
  }

  function clear() {
    activeLoadToken += 1;
    stored.value = null;
  }

  return {
    stored,
    creatorId,
    apiKey,
    isRegistered,
    loadFromWallet,
    signIn,
    clear,
  };
}
