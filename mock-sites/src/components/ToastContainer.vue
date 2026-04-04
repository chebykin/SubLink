<script setup lang="ts">
import { useToast } from "../composables/useToast";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['toast', `toast-${t.type}`, { leaving: t.leaving }]"
      @click="dismiss(t.id)"
    >
      <svg v-if="t.type === 'success'" class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else-if="t.type === 'error'" class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M6 6l4 4m0-4l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <svg v-else class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 5v3m0 3h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="toast-msg">{{ t.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 380px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  animation: toast-in 0.3s var(--ease-spring);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast.leaving {
  animation: toast-out 0.2s ease forwards;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-msg {
  font-size: 0.875rem;
  line-height: 1.4;
  color: var(--text-primary);
}

.toast-success { color: var(--success); }
.toast-success .toast-msg { color: var(--text-primary); }
.toast-error { color: var(--danger); }
.toast-error .toast-msg { color: var(--text-primary); }
.toast-info { color: var(--accent); }
.toast-info .toast-msg { color: var(--text-primary); }

@media (max-width: 640px) {
  .toast-container {
    right: 8px;
    left: 8px;
    max-width: none;
  }
}
</style>
