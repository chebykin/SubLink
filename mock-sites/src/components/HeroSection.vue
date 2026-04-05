<script setup lang="ts">
import { computed } from "vue";
import { SITE_NAME } from "../lib/constants";
import type { Plan } from "../lib/types";
import { formatUsdcDisplay, formatInterval } from "../lib/format";
import { useSubscribeModal } from "../composables/useSubscribeModal";

const props = defineProps<{
  status: string;
  planInfo: Plan | null;
}>();

const { openModal } = useSubscribeModal();

const showSubscribe = computed(
  () => props.status === "not-subscribed" || props.status === "idle",
);
const showVerified = computed(() => props.status === "verified");
</script>

<template>
  <section class="hero">
    <div class="hero-inner">
      <span class="pill pill-accent hero-pill">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 6C4 4 6 2 8 2C10 2 12 4 12 6C12 8 10 9 8 9C6 9 4 10 4 12C4 14 6 14 8 14C10 14 12 12 12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        SubLink Protected
      </span>

      <h1 class="hero-title">{{ SITE_NAME }}</h1>

      <p class="hero-desc">
        Exclusive content powered by privacy-preserving subscriptions.
        Connect your wallet to verify access or subscribe below.
      </p>

      <div class="hero-actions">
        <Transition name="hero-action" mode="out-in">
          <button
            v-if="showSubscribe"
            type="button"
            class="btn btn-primary"
            @click="openModal"
          >
            Subscribe
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span v-else-if="showVerified" class="verified-badge">
            <svg class="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="var(--success)" stroke-width="2" />
              <path class="check-path" d="M6 10l3 3 5-6" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
            Full Access Granted
          </span>
        </Transition>
      </div>

      <div v-if="planInfo && showSubscribe" class="plan-preview">
        <span class="plan-price">{{ formatUsdcDisplay(planInfo.amount) }}</span>
        <span class="plan-sep">/</span>
        <span class="plan-interval">{{ formatInterval(planInfo.intervalSeconds) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 48px 24px 24px;
  text-align: center;
}

.hero-inner {
  max-width: 640px;
  margin: 0 auto;
}

.hero-pill {
  animation: fade-in-up 0.4s var(--ease-decel);
}

.hero-title {
  margin-top: 16px;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  animation: fade-in-up 0.5s var(--ease-decel) 0.05s both;
}

.hero-desc {
  margin-top: 12px;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  animation: fade-in-up 0.5s var(--ease-decel) 0.1s both;
}

.hero-actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  animation: fade-in-up 0.5s var(--ease-decel) 0.15s both;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  background: var(--success-soft);
  color: var(--success);
  font-weight: 600;
  font-size: 0.9375rem;
  animation: scale-in 0.4s var(--ease-spring);
}

.check-path {
  stroke-dasharray: 20;
  stroke-dashoffset: 0;
  animation: check-draw 0.4s ease 0.2s both;
}

.plan-preview {
  margin-top: 12px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--text-muted);
  font-size: 0.875rem;
  animation: fade-in 0.4s ease 0.3s both;
}

.plan-price {
  font-weight: 700;
  color: var(--accent-text);
  font-size: 1rem;
}

.plan-sep {
  color: var(--text-muted);
}

.hero-action-enter-active {
  animation: scale-in 0.3s var(--ease-spring);
}

.hero-action-leave-active {
  animation: fade-in 0.15s ease reverse;
}

@media (max-width: 640px) {
  .hero {
    padding: 32px 16px 16px;
  }
}
</style>
