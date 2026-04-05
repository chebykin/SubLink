import { ref, computed } from "vue";
import {
  deriveAuthKey,
  createBearerToken,
  createListToken,
  signSubscribeProof,
} from "../lib/auth";
import type { AuthState } from "../lib/auth";

const authState = ref<AuthState | null>(null);
const deriving = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => authState.value !== null);
  const authKeyId = computed(() => authState.value?.authKeyId ?? null);
  const authPublicKey = computed(
    () => authState.value?.authAccount.publicKey ?? null,
  );

  async function derive(signMessage: (message: string) => Promise<`0x${string}`>) {
    if (authState.value) return authState.value;
    deriving.value = true;
    try {
      const state = await deriveAuthKey(signMessage);
      authState.value = state;
      return state;
    } finally {
      deriving.value = false;
    }
  }

  async function getListToken(): Promise<string> {
    if (!authState.value) throw new Error("Auth key not derived");
    return createListToken(authState.value.authAccount);
  }

  async function getToken(subscriptionId: string): Promise<string> {
    if (!authState.value) throw new Error("Auth key not derived");
    return createBearerToken(authState.value.authAccount, subscriptionId);
  }

  async function signProof(
    planId: string,
    unlinkAddress: string,
  ): Promise<`0x${string}`> {
    if (!authState.value) throw new Error("Auth key not derived");
    return signSubscribeProof(authState.value.authAccount, planId, unlinkAddress);
  }

  function clear() {
    authState.value = null;
  }

  return {
    authState,
    isAuthenticated,
    authKeyId,
    authPublicKey,
    deriving,
    derive,
    getListToken,
    getToken,
    signProof,
    clear,
  };
}
