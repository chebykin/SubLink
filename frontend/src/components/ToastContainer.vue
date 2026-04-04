<script setup lang="ts">
import { useToast } from "../composables/useToast";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="[toast.type, { leaving: toast.leaving }]"
      @click="dismiss(toast.id)"
    >
      <span class="toast-icon">
        <template v-if="toast.type === 'success'">&#10003;</template>
        <template v-else-if="toast.type === 'error'">&#10007;</template>
        <template v-else>&#8505;</template>
      </span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 72px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(12px);
  font-size: 0.875rem;
  color: var(--text-primary);
}

.toast.leaving {
  animation: toast-out 0.2s ease-in forwards;
}

.toast.success { border-color: rgba(83, 232, 138, 0.3); }
.toast.error { border-color: rgba(232, 83, 83, 0.3); }

.toast-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.success .toast-icon { color: #53e88a; }
.error .toast-icon { color: #e85353; }
.info .toast-icon { color: #53b1e8; }

.toast-message {
  flex: 1;
}
</style>
