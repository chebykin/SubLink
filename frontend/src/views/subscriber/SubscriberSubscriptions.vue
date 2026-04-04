<script setup lang="ts">
import { ref, onMounted } from "vue";
import StatusBadge from "../../components/StatusBadge.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useAuth } from "../../composables/useAuth";
import { useToast } from "../../composables/useToast";
import { useReveal } from "../../composables/useReveal";
import * as api from "../../lib/api";
import type { Subscription } from "../../lib/types";
import { formatUsdcDisplay, formatInterval, relativeTime, truncateAddress } from "../../lib/format";

const { isAuthenticated, getListToken, getToken } = useAuth();
const { add: toast } = useToast();

const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);
const cancelling = ref<string | null>(null);
const confirmCancel = ref<string | null>(null);
const subsRef = ref<HTMLElement | null>(null);

useReveal(subsRef);

function hasCurrentEntitlement(sub: Subscription): boolean {
  if (!sub.paidThroughAt) return false;
  const paidThroughMs = Date.parse(sub.paidThroughAt);
  return !Number.isNaN(paidThroughMs) && paidThroughMs > Date.now();
}

function isChargeable(sub: Subscription): boolean {
  return (
    sub.status === "pending_activation" ||
    sub.status === "active" ||
    sub.status === "past_due"
  );
}

function accessLabel(sub: Subscription): string {
  if (hasCurrentEntitlement(sub) && sub.paidThroughAt) {
    return relativeTime(sub.paidThroughAt);
  }

  return sub.status === "pending_activation" ? "Not active yet" : "Expired";
}

onMounted(async () => {
  if (!isAuthenticated.value) {
    loading.value = false;
    return;
  }
  await loadSubscriptions();
});

async function loadSubscriptions() {
  loading.value = true;
  try {
    const token = await getListToken();
    const res = await api.getSubscriptions(token);
    subscriptions.value = res.subscriptions;
  } catch (e: unknown) {
    toast(`Failed to load: ${api.getErrorMessage(e)}`, "error");
  } finally {
    loading.value = false;
  }
}

async function handleCancel(sub: Subscription) {
  if (confirmCancel.value !== sub.id) {
    confirmCancel.value = sub.id;
    return;
  }
  cancelling.value = sub.id;
  try {
    const token = await getToken(sub.id);
    await api.cancelSubscription(sub.id, token);
    toast("Subscription cancelled", "success");
    confirmCancel.value = null;
    await loadSubscriptions();
  } catch (e: unknown) {
    toast(`Cancel failed: ${api.getErrorMessage(e)}`, "error");
  } finally {
    cancelling.value = null;
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">My Subscriptions</h1>
      <p class="page-subtitle">View and manage your subscriptions</p>
    </div>

    <div v-if="!isAuthenticated" class="card" style="padding: 40px; text-align: center">
      <p style="color: var(--text-secondary)">Connect your wallet and derive your auth key to view subscriptions.</p>
    </div>

    <div v-else-if="loading" class="subs-list">
      <div class="card" style="padding: 24px" v-for="i in 3" :key="i">
        <LoadingSkeleton :lines="3" />
      </div>
    </div>

    <div v-else-if="subscriptions.length === 0">
      <EmptyState title="No subscriptions" description="You haven't subscribed to any plans yet." />
    </div>

    <div v-else ref="subsRef" class="subs-list">
      <div
        v-for="(sub, i) in subscriptions"
        :key="sub.id"
        class="sub-card card card-reveal"
        :style="{ transitionDelay: `${i * 80}ms` }"
      >
        <div class="sub-top">
          <div class="sub-info">
            <h3 class="sub-plan">{{ sub.plan?.name ?? "Plan" }}</h3>
            <StatusBadge :status="sub.status" />
          </div>
          <div class="sub-actions">
            <router-link :to="`/subscriber/charges/${sub.id}`" class="btn btn-sm">
              Charges
            </router-link>
            <button
              v-if="isChargeable(sub)"
              :class="['btn', 'btn-sm', confirmCancel === sub.id ? 'btn-danger-confirm' : 'btn-danger']"
              :disabled="cancelling === sub.id"
              @click="handleCancel(sub)"
            >
              {{ cancelling === sub.id ? "Cancelling..." : confirmCancel === sub.id ? "Confirm Cancel" : "Cancel" }}
            </button>
          </div>
        </div>

        <div class="sub-details">
          <div class="sub-detail">
            <span class="sub-label">Amount</span>
            <span class="sub-value">{{ formatUsdcDisplay(sub.plan?.amount ?? '0') }}</span>
          </div>
          <div class="sub-detail" v-if="sub.plan">
            <span class="sub-label">Interval</span>
            <span class="sub-value">{{ formatInterval(sub.plan.intervalSeconds) }}</span>
          </div>
          <div class="sub-detail">
            <span class="sub-label">Total Spent</span>
            <span class="sub-value">{{ formatUsdcDisplay(sub.totalSpent) }}</span>
          </div>
          <div class="sub-detail">
            <span class="sub-label">Charges</span>
            <span class="sub-value">{{ sub.chargeCount }}</span>
          </div>
          <div class="sub-detail">
            <span class="sub-label">Access</span>
            <span class="sub-value">{{ accessLabel(sub) }}</span>
          </div>
          <div class="sub-detail">
            <span class="sub-label">Next Charge</span>
            <span class="sub-value">{{ isChargeable(sub) ? relativeTime(sub.nextChargeAt) : '—' }}</span>
          </div>
          <div class="sub-detail">
            <span class="sub-label">Address</span>
            <span class="sub-value mono">{{ truncateAddress(sub.unlinkAddress) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  animation: card-enter 0.3s var(--ease-decel);
}

.page-header {
  margin-bottom: 28px;
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

.subs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-card {
  padding: 24px;
}

.sub-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.sub-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-plan {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}

.sub-actions {
  display: flex;
  gap: 8px;
}

.btn-danger-confirm {
  border-color: var(--danger) !important;
  background: var(--danger) !important;
  color: white !important;
  animation: shake 0.4s ease;
}

.sub-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 640px) {
  .sub-details {
    grid-template-columns: repeat(2, 1fr);
  }
}

.sub-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.sub-value {
  font-size: 0.9375rem;
  font-weight: 600;
}

.mono {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.8125rem;
}
</style>
