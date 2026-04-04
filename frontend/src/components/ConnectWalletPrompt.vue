<script setup lang="ts">
import SublinkLogo from "./SublinkLogo.vue";
</script>

<template>
  <div class="connect-prompt">
    <div class="connect-card card">
      <SublinkLogo :size="56" />
      <h2>Connect Your Wallet</h2>
      <p>Connect a wallet to access this section.</p>
      <appkit-button />
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

.connect-card h2 {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
}

.connect-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}
</style>
