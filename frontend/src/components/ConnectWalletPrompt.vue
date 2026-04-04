<script setup lang="ts">
import SublinkLogo from "./SublinkLogo.vue";
import { useMode } from "../composables/useMode";
import { computed } from "vue";

const { mode } = useMode();

const message = computed(() =>
  mode.value === "creator"
    ? "Connect your wallet to manage your subscription plans"
    : "Connect your wallet to view your subscriptions",
);
</script>

<template>
  <div class="connect-prompt">
    <div class="connect-card card">
      <div class="connect-logo">
        <SublinkLogo :size="56" />
      </div>
      <h2 class="connect-title">Connect Your Wallet</h2>
      <p class="connect-desc">{{ message }}</p>
      <div class="connect-btn">
        <appkit-button />
      </div>
    </div>
  </div>
</template>

<style scoped>
.connect-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  animation: card-enter 0.3s var(--ease-decel);
}

.connect-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  animation: connect-pulse 3s ease-in-out infinite;
}

@keyframes connect-pulse {
  0%, 100% {
    border-color: var(--border);
  }
  50% {
    border-color: var(--border-strong);
  }
}

.connect-logo {
  animation: fade-in-up 0.4s var(--ease-decel);
}

.connect-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  animation: fade-in-up 0.4s var(--ease-decel) 0.05s both;
}

.connect-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  animation: fade-in-up 0.4s var(--ease-decel) 0.1s both;
}

.connect-btn {
  animation: fade-in-up 0.4s var(--ease-decel) 0.15s both;
}
</style>
