<script setup lang="ts">
import { ref, onMounted } from "vue";
import StatusBadge from "../../components/StatusBadge.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useToast } from "../../composables/useToast";
import * as api from "../../lib/api";
import type { PlanWithCreator } from "../../lib/types";
import { formatUsdcDisplay, formatInterval, formatDate } from "../../lib/format";

const props = defineProps<{ id: string }>();
const { add: toast } = useToast();

const plan = ref<PlanWithCreator | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    plan.value = await api.getPlan(props.id);
  } catch (e: unknown) {
    toast(`Failed to load plan: ${api.getErrorMessage(e)}`, "error");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <router-link to="/creator/plans" class="back-link">&larr; Back to Plans</router-link>

    <div v-if="loading" class="card detail-card">
      <LoadingSkeleton :lines="5" height="20px" />
    </div>

    <div v-else-if="plan" class="card detail-card">
      <div class="detail-header">
        <div>
          <h1 class="detail-title">{{ plan.name }}</h1>
          <p class="detail-creator">by {{ plan.creator.name }}</p>
        </div>
        <StatusBadge :status="plan.active ? 'active' : 'completed'" />
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Price</span>
          <span class="detail-value accent">{{ formatUsdcDisplay(plan.amount) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Interval</span>
          <span class="detail-value">{{ formatInterval(plan.intervalSeconds) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Spending Cap</span>
          <span class="detail-value">{{ plan.spendingCap === "0" ? "Unlimited" : formatUsdcDisplay(plan.spendingCap) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Created</span>
          <span class="detail-value">{{ formatDate(plan.createdAt) }}</span>
        </div>
      </div>

      <div v-if="plan.description" class="detail-desc">
        <span class="detail-label">Description</span>
        <p>{{ plan.description }}</p>
      </div>

      <div class="detail-id">
        <span class="detail-label">Plan ID</span>
        <code>{{ plan.id }}</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  animation: card-enter 0.3s var(--ease-decel);
}

.back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.15s ease;
}

.back-link:hover {
  color: var(--accent);
}

.detail-card {
  padding: 32px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.detail-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.detail-creator {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-value {
  font-size: 1.0625rem;
  font-weight: 600;
}

.detail-value.accent {
  color: var(--accent);
}

.detail-desc {
  margin-bottom: 20px;
}

.detail-desc p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.detail-id code {
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  word-break: break-all;
}
</style>
