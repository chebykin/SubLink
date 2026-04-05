import { ref, computed, watch } from "vue";
import { useWallet } from "./useWallet";
import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import { listSubscriptions, verifyAccess, getErrorMessage, ApiError } from "../lib/api";
import { PLAN_ID, API_KEY } from "../lib/constants";
import type { Plan } from "../lib/types";

export type AccessState =
  | "idle"
  | "deriving"
  | "checking"
  | "verified"
  | "not-subscribed"
  | "error";

const accessState = ref<AccessState>("idle");
const planInfo = ref<Plan | null>(null);
const error = ref<string | null>(null);
const subscriptionId = ref<string | null>(null);

export function useAccess() {
  const { isConnected, signMessage } = useWallet();
  const { derive, getListToken, getToken, isAuthenticated, clear: clearAuth } = useAuth();
  const { add: toast } = useToast();

  const hasAccess = computed(() => accessState.value === "verified");
  const isLoading = computed(
    () => accessState.value === "deriving" || accessState.value === "checking",
  );

  watch(isConnected, (connected) => {
    if (!connected) {
      reset();
      clearAuth();
    }
  });

  function reset() {
    accessState.value = "idle";
    planInfo.value = null;
    error.value = null;
    subscriptionId.value = null;
  }

  async function checkAccess() {
    if (!PLAN_ID || !API_KEY) {
      error.value = "Site not configured: missing PLAN_ID or API_KEY";
      accessState.value = "error";
      return;
    }

    try {
      // 1. Derive auth key
      accessState.value = "deriving";
      await derive(signMessage);

      // 2. Look for existing subscription
      accessState.value = "checking";
      const listToken = await getListToken();
      const { subscriptions } = await listSubscriptions(listToken, PLAN_ID);

      const activeSub = subscriptions.find(
        (s) => s.status === "active" || s.status === "pending_activation",
      );

      if (!activeSub) {
        accessState.value = "not-subscribed";
        await fetchPlanInfo();
        return;
      }

      // For pending_activation subs the backend's verify would 402 (no
      // paidThroughAt yet). Treat the subscription's existence as access
      // for demo purposes and skip the server-side verify.
      if (activeSub.status === "pending_activation") {
        accessState.value = "verified";
        subscriptionId.value = activeSub.id;
        toast("Subscription active (pending activation).", "success");
        return;
      }

      // 3. Create bearer token and verify
      const bearerToken = await getToken(activeSub.id);
      const result = await verifyAccess(PLAN_ID, bearerToken, API_KEY);

      if (result.valid) {
        accessState.value = "verified";
        subscriptionId.value = activeSub.id;
        toast("Access verified! You have full access.", "success");
      } else {
        accessState.value = "not-subscribed";
        if (result.sublink?.plan) {
          planInfo.value = result.sublink.plan;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("User rejected")) {
        toast("Signature request cancelled", "error");
        accessState.value = "idle";
        return;
      }
      error.value = getErrorMessage(e);
      accessState.value = "error";
      toast(`Verification failed: ${getErrorMessage(e)}`, "error");
    }
  }

  async function fetchPlanInfo() {
    try {
      // Call verify without a real bearer token to get the 402 discovery response
      await verifyAccess(PLAN_ID, "none", API_KEY);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402 && e.details) {
        const details = e.details as { sublink?: { plan?: Plan } };
        if (details.sublink?.plan) {
          planInfo.value = details.sublink.plan;
        }
      }
    }
  }

  async function retry() {
    reset();
    await checkAccess();
  }

  return {
    accessState,
    planInfo,
    error,
    subscriptionId,
    hasAccess,
    isLoading,
    checkAccess,
    retry,
    reset,
  };
}
