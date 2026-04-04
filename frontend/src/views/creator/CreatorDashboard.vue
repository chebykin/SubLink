<script setup lang="ts">
import { computed, ref, watch } from "vue";
import StatCard from "../../components/StatCard.vue";
import CopyButton from "../../components/CopyButton.vue";
import CreatorSignInPrompt from "../../components/CreatorSignInPrompt.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useCreator } from "../../composables/useCreator";
import { useToast } from "../../composables/useToast";
import { useReveal } from "../../composables/useReveal";
import * as api from "../../lib/api";
import type { Plan } from "../../lib/types";

const { stored, creatorId, isRegistered } = useCreator();
const { add: toast } = useToast();

const plans = ref<Plan[]>([]);
const loading = ref(true);
const creatorName = computed(() => stored.value?.name ?? "Creator");
const actionsRef = ref<HTMLElement | null>(null);

useReveal(actionsRef);

let plansLoadToken = 0;

watch(
  creatorId,
  async (nextCreatorId) => {
    const loadToken = ++plansLoadToken;
    plans.value = [];

    if (!nextCreatorId) {
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const res = await api.getPlans(nextCreatorId);
      if (loadToken === plansLoadToken) {
        plans.value = res.plans;
      }
    } catch (e: unknown) {
      toast(`Failed to load plans: ${api.getErrorMessage(e)}`, "error");
    } finally {
      if (loadToken === plansLoadToken) {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

const activePlans = computed(() => plans.value.filter((p) => p.active).length);
const totalPlans = computed(() => plans.value.length);
</script>

<template>
  <div class="page">
    <CreatorSignInPrompt v-if="!isRegistered" />

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">Welcome, {{ creatorName }}</h1>
        <p class="page-subtitle">Creator Dashboard</p>
      </div>

      <div v-if="loading" class="stats-grid">
        <div class="card stat-skeleton" v-for="i in 3" :key="i">
          <LoadingSkeleton variant="stat" />
        </div>
      </div>

      <template v-else>
      <div class="stats-grid">
        <StatCard label="Total Plans" :value="totalPlans" />
        <StatCard label="Active Plans" :value="activePlans" />
        <StatCard label="Plans Created" :value="totalPlans" />
      </div>

      <div class="credentials card">
        <div class="cred-header">
          <h2 class="cred-title">API Credentials</h2>
          <span class="cred-note">Use these to integrate your creator site with SubLink</span>
        </div>
        <div class="cred-grid">
          <div class="cred-item">
            <span class="cred-label">Creator ID</span>
            <div class="cred-row">
              <code>{{ stored!.id }}</code>
              <CopyButton :text="stored!.id" label="Creator ID" />
            </div>
          </div>
          <div class="cred-item">
            <span class="cred-label">API Key</span>
            <div class="cred-row">
              <code class="secret">{{ stored!.apiKey }}</code>
              <CopyButton :text="stored!.apiKey" label="API Key" />
            </div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div ref="actionsRef" class="actions-grid">
          <router-link to="/creator/plans" class="action-card card card-reveal" style="transition-delay: 0ms">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M12 4v16m-8-8h16" />
            </svg>
            <span>Create a Plan</span>
          </router-link>
          <router-link to="/creator/subscriptions" class="action-card card card-reveal" style="transition-delay: 80ms">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>View Subscribers</span>
          </router-link>
          <router-link to="/creator/earnings" class="action-card card card-reveal" style="transition-delay: 160ms">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>View Earnings</span>
          </router-link>
        </div>
      </div>
      </template>
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
  background: linear-gradient(135deg, var(--text-primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.stat-skeleton {
  padding: 20px 24px;
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

.action-card:hover svg {
  color: var(--accent);
}

.credentials {
  padding: 24px;
  margin-bottom: 32px;
  animation: card-enter 0.4s var(--ease-decel) 0.2s both;
}

.cred-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cred-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}

.cred-note {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.cred-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.cred-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cred-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cred-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cred-row code {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  word-break: break-all;
  font-family: "SF Mono", "Fira Code", monospace;
}

.cred-row code.secret {
  color: var(--accent);
}
</style>
