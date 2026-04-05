<script setup lang="ts">
import { computed, watch } from "vue";
import { useSubscribe } from "../composables/useSubscribe";
import { useSubscribeModal } from "../composables/useSubscribeModal";
import { useAccess } from "../composables/useAccess";
import { formatUsdcDisplay, formatInterval } from "../lib/format";
import { DEPOSIT_PERIODS, PLAN_ID } from "../lib/constants";
import type { Plan } from "../lib/types";

const { open, closeModal } = useSubscribeModal();
const { steps, running, done, error, plan, depositAmount, run, reset } =
  useSubscribe();
const { planInfo: accessPlanInfo } = useAccess();

// Auto-start the flow when the modal opens
watch(open, (isOpen) => {
  if (isOpen && !running.value && !done.value) {
    if (!PLAN_ID) {
      error.value = "Site not configured: missing PLAN_ID";
      return;
    }
    void run(PLAN_ID);
  }
});

// When the flow finishes successfully, auto-close after a beat
watch(done, (isDone) => {
  if (isDone) {
    setTimeout(() => {
      closeModal();
    }, 1500);
  }
});

// Display plan: prefer full plan details fetched by useSubscribe, fall back
// to the preview plan from useAccess so the header renders immediately.
const displayPlan = computed<Plan | null>(() => {
  if (plan.value) {
    return {
      name: plan.value.name,
      amount: plan.value.amount,
      intervalSeconds: plan.value.intervalSeconds,
    };
  }
  return accessPlanInfo.value;
});

const canClose = computed(() => !running.value || Boolean(error.value));

function handleClose() {
  if (!canClose.value) return;
  closeModal();
  // Reset after the fade-out finishes so the next open starts clean
  setTimeout(() => {
    reset();
  }, 200);
}

function handleRetry() {
  reset();
  if (PLAN_ID) void run(PLAN_ID);
}
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="modal-backdrop" @click.self="handleClose">
      <div class="modal card" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <h2 class="modal-title">Subscribe</h2>
            <div v-if="displayPlan" class="modal-plan">
              <span class="plan-name">{{ displayPlan.name }}</span>
              <span class="plan-price">
                {{ formatUsdcDisplay(displayPlan.amount) }}
                <span class="plan-interval">
                  / {{ formatInterval(displayPlan.intervalSeconds) }}
                </span>
              </span>
            </div>
          </div>
          <button
            class="modal-close"
            :disabled="!canClose"
            aria-label="Close"
            @click="handleClose"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <div v-if="depositAmount" class="modal-deposit">
          Depositing {{ formatUsdcDisplay(depositAmount) }} ({{ DEPOSIT_PERIODS }}× plan)
          — covers the first {{ DEPOSIT_PERIODS }} billing cycles.
        </div>

        <ol class="step-list">
          <li
            v-for="step in steps"
            :key="step.id"
            class="step"
            :class="`step-${step.status}`"
          >
            <span class="step-icon" aria-hidden="true">
              <svg
                v-if="step.status === 'active'"
                class="spinner"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-dasharray="20 40"
                />
              </svg>
              <svg
                v-else-if="step.status === 'done'"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M3 8.5L6.5 12L13 5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg
                v-else-if="step.status === 'error'"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span v-else class="step-dot" />
            </span>
            <span class="step-content">
              <span class="step-label">{{ step.label }}</span>
              <span v-if="step.detail" class="step-detail">{{ step.detail }}</span>
            </span>
          </li>
        </ol>

        <div v-if="error" class="modal-error">
          <strong>Failed:</strong> {{ error }}
        </div>

        <footer class="modal-footer">
          <button
            v-if="error"
            class="btn btn-primary"
            @click="handleRetry"
          >
            Retry
          </button>
          <button
            class="btn"
            :disabled="!canClose"
            @click="handleClose"
          >
            {{ done ? "Close" : error ? "Close" : "Cancel" }}
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 16, 8, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 480px;
  padding: 24px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.modal-plan {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plan-price {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary);
}

.plan-interval {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.modal-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.modal-close:hover:not(:disabled) {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.modal-close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.modal-deposit {
  padding: 10px 12px;
  margin-bottom: 16px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--accent-text);
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent-border);
}

.step-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.step-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.step-pending {
  color: var(--text-muted);
}

.step-active {
  color: var(--accent);
}

.step-done {
  color: var(--success, #0a7c3e);
}

.step-error {
  color: var(--error, #c0392b);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.step-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.step-pending .step-label {
  color: var(--text-muted);
}

.step-detail {
  font-size: 0.75rem;
  color: var(--text-secondary);
  word-break: break-all;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
}

.modal-error {
  margin-top: 16px;
  padding: 10px 12px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--error, #c0392b);
  background: color-mix(in srgb, var(--error, #c0392b) 8%, transparent 92%);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--error, #c0392b) 25%, transparent 75%);
}

.modal-footer {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: var(--bg-muted);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 90%, black 10%);
}

.spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.2s var(--ease-spring, ease-out);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .modal-backdrop {
    padding: 12px;
  }

  .modal {
    padding: 18px;
  }
}
</style>
