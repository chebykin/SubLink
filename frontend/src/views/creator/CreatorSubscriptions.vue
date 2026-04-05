<script setup lang="ts">
import { ref, watch } from "vue";
import StatusBadge from "../../components/StatusBadge.vue";
import EmptyState from "../../components/EmptyState.vue";
import CreatorSignInPrompt from "../../components/CreatorSignInPrompt.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useCreator } from "../../composables/useCreator";
import { useToast } from "../../composables/useToast";
import * as api from "../../lib/api";
import type { Subscription } from "../../lib/types";
import { formatUsdcDisplay } from "../../lib/format";

const { apiKey, isRegistered } = useCreator();
const { add: toast } = useToast();

const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);

let loadToken = 0;

async function load(key: string) {
  const token = ++loadToken;
  loading.value = true;
  try {
    const res = await api.getCreatorSubscriptions(key);
    if (token === loadToken) {
      subscriptions.value = res.subscriptions;
    }
  } catch (e: unknown) {
    toast(`Failed to load subscribers: ${api.getErrorMessage(e)}`, "error");
  } finally {
    if (token === loadToken) {
      loading.value = false;
    }
  }
}

watch(
  apiKey,
  async (key) => {
    loadToken += 1;
    subscriptions.value = [];
    if (!key) {
      loading.value = false;
      return;
    }
    await load(key);
  },
  { immediate: true },
);

function shortId(id: string): string {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}
</script>

<template>
  <div class="page">
    <CreatorSignInPrompt v-if="!isRegistered" />

    <template v-else>
      <div class="page-header">
        <div>
          <h1 class="page-title">Subscribers</h1>
          <p class="page-subtitle">
            {{ subscriptions.length }} subscription{{ subscriptions.length === 1 ? "" : "s" }} across your plans
          </p>
        </div>
        <button
          class="btn"
          :disabled="loading || !apiKey"
          @click="apiKey && load(apiKey)"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading" class="list">
        <div class="card" v-for="i in 3" :key="i" style="padding: 20px 24px">
          <LoadingSkeleton :lines="3" />
        </div>
      </div>

      <div v-else-if="subscriptions.length === 0">
        <EmptyState
          title="No subscribers yet"
          description="When someone subscribes to one of your plans, they'll show up here."
        />
      </div>

      <div v-else class="list">
        <div v-for="sub in subscriptions" :key="sub.id" class="card sub-card">
          <div class="sub-top">
            <div class="sub-id">
              <span class="label">Subscription</span>
              <code class="mono">{{ shortId(sub.id) }}</code>
            </div>
            <StatusBadge :status="sub.status" />
          </div>

          <div class="sub-meta">
            <div class="meta-item">
              <span class="meta-label">Plan</span>
              <span class="meta-value">{{ sub.plan?.name ?? "—" }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Amount</span>
              <span class="meta-value">{{ formatUsdcDisplay(sub.plan?.amount ?? "0") }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Charges</span>
              <span class="meta-value">{{ sub.chargeCount }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Total spent</span>
              <span class="meta-value">{{ formatUsdcDisplay(sub.totalSpent) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Subscribed</span>
              <span class="meta-value">{{ formatDate(sub.createdAt) }}</span>
            </div>
          </div>

          <div class="sub-addr">
            <span class="label">Subscriber auth key</span>
            <code class="mono small">{{ sub.authKeyId }}</code>
          </div>
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-card {
  padding: 20px 24px;
}

.sub-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sub-id {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  color: var(--text-primary);
}

.mono.small {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.sub-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px 20px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.sub-addr {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
