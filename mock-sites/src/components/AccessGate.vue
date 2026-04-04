<script setup lang="ts">
import { SUBSCRIBE_URL } from "../lib/constants";
import { formatUsdcDisplay, formatInterval } from "../lib/format";
import type { Plan } from "../lib/types";

defineProps<{
  planInfo: Plan | null;
  isConnected: boolean;
  onConnect: () => void;
}>();
</script>

<template>
  <div class="gate-wrapper">
    <div class="gate card">
      <div class="gate-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="var(--accent)" stroke-width="2" opacity="0.3" />
          <rect x="13" y="18" width="14" height="11" rx="2" stroke="var(--accent)" stroke-width="2" />
          <path d="M16 18v-3a4 4 0 018 0v3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <h3 class="gate-title">Subscribe to unlock all content</h3>

      <p class="gate-desc">
        Get full access to exclusive articles, guides, and research.
      </p>

      <div v-if="planInfo" class="gate-plan">
        <span class="gate-plan-name">{{ planInfo.name }}</span>
        <span class="gate-plan-price">
          {{ formatUsdcDisplay(planInfo.amount) }}
          <span class="gate-plan-interval">/ {{ formatInterval(planInfo.intervalSeconds) }}</span>
        </span>
      </div>

      <div class="gate-actions">
        <a
          v-if="isConnected"
          :href="SUBSCRIBE_URL"
          class="btn btn-primary"
          target="_blank"
          rel="noreferrer"
        >
          Subscribe on SubLink
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 8h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <button v-else class="btn btn-primary" @click="onConnect">
          Connect Wallet
        </button>
      </div>

      <p class="gate-note">
        Already subscribed? Connect your wallet and we'll verify automatically.
      </p>
    </div>
  </div>
</template>

<style scoped>
.gate-wrapper {
  padding: 0 24px 32px;
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
}

.gate {
  padding: 40px;
  text-align: center;
  animation: scale-in 0.4s var(--ease-spring);
  border: 1px solid var(--accent-border);
  background: linear-gradient(
    180deg,
    var(--bg-card) 0%,
    color-mix(in srgb, var(--accent) 2%, var(--bg-card) 98%) 100%
  );
}

.gate-icon {
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.gate-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.gate-desc {
  margin-top: 8px;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.gate-plan {
  margin-top: 20px;
  padding: 16px 24px;
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  background: var(--accent-soft);
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-border);
}

.gate-plan-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.gate-plan-price {
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--text-primary);
}

.gate-plan-interval {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.gate-actions {
  margin-top: 24px;
}

.gate-note {
  margin-top: 12px;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .gate-wrapper {
    padding: 0 16px 24px;
  }

  .gate {
    padding: 28px 20px;
  }
}
</style>
