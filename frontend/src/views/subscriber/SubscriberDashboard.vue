<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import StatCard from "../../components/StatCard.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useAuth } from "../../composables/useAuth";
import { useToast } from "../../composables/useToast";
import { useReveal } from "../../composables/useReveal";
import * as api from "../../lib/api";
import type { Subscription } from "../../lib/types";
import { formatUsdc } from "../../lib/format";

const { isAuthenticated, authKeyId, getListToken } = useAuth();
const { add: toast } = useToast();

const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);
const actionsRef = ref<HTMLElement | null>(null);

useReveal(actionsRef);

onMounted(async () => {
  if (!isAuthenticated.value) {
    loading.value = false;
    return;
  }
  try {
    const token = await getListToken();
    const res = await api.getSubscriptions(token);
    subscriptions.value = res.subscriptions;
  } catch (e: unknown) {
    toast(`Failed to load subscriptions: ${api.getErrorMessage(e)}`, "error");
  } finally {
    loading.value = false;
  }
});

function hasCurrentEntitlement(paidThroughAt: string | null): boolean {
  if (!paidThroughAt) return false;
  const paidThroughMs = Date.parse(paidThroughAt);
  return !Number.isNaN(paidThroughMs) && paidThroughMs > Date.now();
}

const activeSubs = computed(() =>
  subscriptions.value.filter((s) => hasCurrentEntitlement(s.paidThroughAt)).length,
);

const totalSpent = computed(() => {
  const total = subscriptions.value.reduce(
    (sum, s) => sum + BigInt(s.totalSpent || "0"),
    0n,
  );
  return formatUsdc(total.toString());
});

const totalCharges = computed(() =>
  subscriptions.value.reduce((sum, s) => sum + s.chargeCount, 0),
);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Subscriber Dashboard</h1>
      <p class="page-subtitle">Manage your subscriptions</p>
    </div>

    <template v-if="!isAuthenticated">
      <div class="card connect-prompt">
        <h2>Connect Your Wallet</h2>
        <p>Connect your wallet and sign a message to derive your auth key. This lets you view and manage your subscriptions.</p>
        <p class="note">Your auth key ID: <code>{{ authKeyId ?? "not derived" }}</code></p>
      </div>
    </template>

    <template v-else-if="loading">
      <div class="stats-grid">
        <div class="card" style="padding: 20px 24px" v-for="i in 3" :key="i">
          <LoadingSkeleton variant="stat" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="stats-grid">
        <StatCard label="Current Access" :value="activeSubs" />
        <StatCard label="Total Spent" :value="totalSpent" suffix=" USDC" :animate="false" />
        <StatCard label="Total Charges" :value="totalCharges" />
      </div>

      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div ref="actionsRef" class="actions-grid">
          <router-link to="/subscriber/subscriptions" class="action-card card card-reveal" style="transition-delay: 0ms">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>View Subscriptions</span>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  animation: card-enter 0.3s var(--ease-decel);
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.connect-prompt {
  padding: 40px;
  text-align: center;
}

.connect-prompt h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.connect-prompt p {
  margin: 0 0 12px;
  color: var(--text-secondary);
}

.connect-prompt .note {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.connect-prompt code {
  background: var(--bg-primary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 20px;
  text-decoration: none;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9375rem;
  font-weight: 500;
}

.action-card:hover {
  color: var(--accent);
  transform: translateY(-2px);
}
</style>
