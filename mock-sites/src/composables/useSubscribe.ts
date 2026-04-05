import { ref } from "vue";
import { hexToBytes, keccak256, toHex, type Hex } from "viem";
import { unlinkAccount } from "@unlink-xyz/sdk";

import { useWallet } from "./useWallet";
import { useAuth } from "./useAuth";
import { useAccess } from "./useAccess";
import { createBrowserUnlinkClient } from "../lib/unlink-client";
import { serializeAccountKeys } from "../lib/account-keys";
import { getPlan, createSubscription, ApiError } from "../lib/api";
import { DEPOSIT_PERIODS, USDC_ADDRESS } from "../lib/constants";
import type { PlanDetails } from "../lib/types";

export type SubscribeStepId =
  | "auth-key"
  | "fetch-plan"
  | "derive-account"
  | "register"
  | "approve"
  | "deposit"
  | "wait-balance"
  | "subscribe";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface SubscribeStep {
  id: SubscribeStepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

const INITIAL_STEPS: SubscribeStep[] = [
  { id: "auth-key", label: "Derive auth key", status: "pending" },
  { id: "fetch-plan", label: "Fetch plan details", status: "pending" },
  { id: "derive-account", label: "Derive dedicated Unlink account", status: "pending" },
  { id: "register", label: "Register account with Unlink", status: "pending" },
  { id: "approve", label: "Approve USDC", status: "pending" },
  { id: "deposit", label: "Deposit into private balance", status: "pending" },
  { id: "wait-balance", label: "Wait for deposit to settle", status: "pending" },
  { id: "subscribe", label: "Create subscription", status: "pending" },
];

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 180_000;

// Module-level state so the modal and any Subscribe button share the same flow.
const steps = ref<SubscribeStep[]>(structuredClone(INITIAL_STEPS));
const running = ref(false);
const done = ref(false);
const error = ref<string | null>(null);
const plan = ref<PlanDetails | null>(null);
const depositAmount = ref<string | null>(null);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findTokenBalance(
  balances: Array<{ token: string; amount: string }>,
  token: string,
): bigint {
  const match = balances.find(
    (b) => b.token.toLowerCase() === token.toLowerCase(),
  );
  return match ? BigInt(match.amount) : 0n;
}

function updateStep(id: SubscribeStepId, patch: Partial<SubscribeStep>) {
  const next = steps.value.slice();
  const idx = next.findIndex((s) => s.id === id);
  const current = next[idx];
  if (idx >= 0 && current) {
    next[idx] = { ...current, ...patch };
    steps.value = next;
  }
}

function markActive(id: SubscribeStepId, detail?: string) {
  updateStep(id, { status: "active", detail });
}

function markDone(id: SubscribeStepId, detail?: string) {
  updateStep(id, { status: "done", detail });
}

function markError(id: SubscribeStepId, detail: string) {
  updateStep(id, { status: "error", detail });
}

export function resetSubscribe() {
  steps.value = structuredClone(INITIAL_STEPS);
  running.value = false;
  done.value = false;
  error.value = null;
  plan.value = null;
  depositAmount.value = null;
}

export function useSubscribe() {
  const { isConnected, signMessage } = useWallet();
  const { derive, signProof, authState, authPublicKey } = useAuth();
  const { checkAccess } = useAccess();

  async function run(planId: string): Promise<boolean> {
    if (running.value) return false;
    if (!isConnected.value) {
      error.value = "Connect your wallet first.";
      return false;
    }

    resetSubscribe();
    running.value = true;

    try {
      // 1. Derive auth key
      markActive("auth-key");
      await derive(signMessage);
      if (!authState.value || !authPublicKey.value) {
        throw new Error("Auth key derivation failed.");
      }
      const authKeyId = authState.value.authKeyId;
      markDone("auth-key", `Auth key ${authKeyId.slice(0, 10)}…`);

      // 2. Fetch plan
      markActive("fetch-plan");
      const planDetails = await getPlan(planId);
      plan.value = planDetails;
      markDone(
        "fetch-plan",
        `${planDetails.name} · ${planDetails.amount} atomic USDC / ${planDetails.intervalSeconds}s`,
      );

      // 3. Derive dedicated subscription account
      markActive("derive-account");
      const derivationIndex = Number(
        BigInt(keccak256(toHex(planId))) % 1_000_000n,
      );
      const signed = (await signMessage(`sublink:${planId}`)) as Hex;
      const seedHex = keccak256(signed);
      const dedicatedAccount = unlinkAccount.fromSeed({
        seed: hexToBytes(seedHex),
        accountIndex: derivationIndex,
      });
      markDone("derive-account", `index ${derivationIndex}`);

      // 4. Create Unlink client + register
      markActive("register");
      const client = await createBrowserUnlinkClient(dedicatedAccount);
      await client.ensureRegistered();
      const unlinkAddress = await client.getAddress();
      markDone("register", unlinkAddress);

      // 5. Compute deposit + ensure ERC20 approval
      const deposit = (
        BigInt(planDetails.amount) * BigInt(DEPOSIT_PERIODS)
      ).toString();
      depositAmount.value = deposit;

      markActive("approve", `${DEPOSIT_PERIODS}× plan amount`);
      const approval = await client.ensureErc20Approval({
        token: USDC_ADDRESS,
        amount: deposit,
      });
      if (approval.status === "submitted") {
        markActive("approve", "Waiting for approval tx…");
        for (let attempt = 0; attempt < 30; attempt++) {
          await sleep(2_000);
          const state = await client.getApprovalState({
            token: USDC_ADDRESS,
            amount: deposit,
          });
          if (state.isApproved) break;
        }
        markDone("approve", "Approved on-chain");
      } else {
        markDone("approve", "Already approved");
      }

      // 6. Deposit into private balance
      markActive("deposit");
      const depositResult = await client.deposit({
        token: USDC_ADDRESS,
        amount: deposit,
      });
      markDone("deposit", `tx ${depositResult.txId.slice(0, 10)}…`);

      // 7. Wait for private balance to reflect deposit
      markActive("wait-balance");
      const minAmount = BigInt(deposit);
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let current = 0n;
      while (current < minAmount) {
        if (Date.now() >= deadline) {
          throw new Error(
            `Private balance did not reach ${deposit} atomic USDC within ${POLL_TIMEOUT_MS}ms (current=${current}).`,
          );
        }
        const { balances } = await client.getBalances({ token: USDC_ADDRESS });
        current = findTokenBalance(balances, USDC_ADDRESS);
        if (current >= minAmount) break;
        await sleep(POLL_INTERVAL_MS);
      }
      markDone("wait-balance", "Balance settled");

      // 8. Sign subscribe proof + POST /subscribe
      markActive("subscribe");
      const accountKeys = await dedicatedAccount.getAccountKeys();
      const accountKeysJson = serializeAccountKeys(accountKeys);
      const authProof = await signProof(planId, unlinkAddress);

      const result = await createSubscription({
        planId,
        unlinkAddress,
        accountKeysJson,
        authKeyId,
        authPublicKey: authPublicKey.value,
        authProof,
      });
      markDone(
        "subscribe",
        `Subscription ${result.subscriptionId.slice(0, 10)}…`,
      );

      // 9. Refresh access state so content unlocks
      await checkAccess();
      running.value = false;
      done.value = true;
      return true;
    } catch (e) {
      running.value = false;
      const message = extractErrorMessage(e);
      error.value = message;
      const active = steps.value.find((s) => s.status === "active");
      if (active) markError(active.id, message);
      return false;
    }
  }

  return {
    steps,
    running,
    done,
    error,
    plan,
    depositAmount,
    run,
    reset: resetSubscribe,
  };
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const details = e.details as
      | { firstCharge?: { errorMessage?: string } }
      | undefined;
    const chargeMsg = details?.firstCharge?.errorMessage;
    return chargeMsg ? `${e.message} (${chargeMsg})` : e.message;
  }
  if (e instanceof Error) {
    if (e.message.toLowerCase().includes("user rejected")) {
      return "Signature request cancelled";
    }
    return e.message;
  }
  return String(e);
}
