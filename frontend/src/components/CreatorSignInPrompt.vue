<script setup lang="ts">
import { ref } from "vue";
import { useCreator } from "../composables/useCreator";
import { useWallet } from "../composables/useWallet";
import { useToast } from "../composables/useToast";
import { getErrorMessage } from "../lib/api";
import SublinkLogo from "./SublinkLogo.vue";

const { signIn } = useCreator();
const { address, signMessage } = useWallet();
const { add: toast } = useToast();

const signing = ref(false);

async function handleSignIn() {
  if (!address.value) {
    toast("Connect your wallet first.", "error");
    return;
  }
  signing.value = true;
  try {
    await signIn(signMessage, address.value);
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    const lower = message.toLowerCase();
    if (
      lower.includes("user rejected") ||
      lower.includes("rejected the request") ||
      lower.includes("user denied")
    ) {
      return;
    }
    toast(`Sign in failed: ${message}`, "error");
  } finally {
    signing.value = false;
  }
}
</script>

<template>
  <div class="prompt">
    <div class="prompt-card card">
      <SublinkLogo :size="48" />
      <h2 class="prompt-title">Sign in to continue</h2>
      <p class="prompt-desc">
        Sign a message with your wallet to access your creator dashboard. No account yet? We'll create one automatically.
      </p>
      <button class="btn btn-primary" :disabled="signing" @click="handleSignIn">
        {{ signing ? "Waiting for signature..." : "Sign in with wallet" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  animation: card-enter 0.3s var(--ease-decel);
}

.prompt-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 36px;
  text-align: center;
  max-width: 420px;
}

.prompt-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.prompt-desc {
  margin: 0 0 6px;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  line-height: 1.5;
}
</style>
