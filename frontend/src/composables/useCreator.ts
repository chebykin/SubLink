import { ref, computed } from "vue";
import type { CreatorWithKey } from "../lib/types";

const STORAGE_KEY = "sublink-creator";

interface StoredCreator {
  id: string;
  apiKey: string;
  evmAddress: string;
  unlinkAddress: string;
  name: string;
}

function loadStored(): StoredCreator | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const stored = ref<StoredCreator | null>(loadStored());

export function useCreator() {
  const creatorId = computed(() => stored.value?.id ?? null);
  const apiKey = computed(() => stored.value?.apiKey ?? null);
  const isRegistered = computed(() => stored.value !== null);

  function save(creator: CreatorWithKey) {
    const data: StoredCreator = {
      id: creator.id,
      apiKey: creator.apiKey,
      evmAddress: creator.evmAddress,
      unlinkAddress: creator.unlinkAddress,
      name: creator.name,
    };
    stored.value = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clear() {
    stored.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  return { stored, creatorId, apiKey, isRegistered, save, clear };
}
