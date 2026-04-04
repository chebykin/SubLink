<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import StatCard from "../../components/StatCard.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useCreator } from "../../composables/useCreator";
import { useToast } from "../../composables/useToast";
import { useReveal } from "../../composables/useReveal";
import * as api from "../../lib/api";
import type { Plan } from "../../lib/types";
import { formatUsdc } from "../../lib/format";

const { stored, isRegistered } = useCreator();
const { add: toast } = useToast();

const plans = ref<Plan[]>([]);
const loading = ref(true);
const creatorName = computed(() => stored.value?.name ?? "Creator");
const actionsRef = ref<HTMLElement | null>(null);

useReveal(actionsRef);

onMounted(async () => {
  if (!isRegistered.value) {
    loading.value = false;
    return;
  }
  try {
    const res = await api.getPlans(stored.value!.id);
    plans.value = res.plans;
  } catch (e: unknown) {
    toast(`Failed to load plans: ${api.getErrorMessage(e)}`, "error");
  } finally {
    loading.value = false;
  }
});

const activePlans = computed(() => plans.value.filter((p) => p.active).length);
const totalPlans = computed(() => plans.value.length);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Welcome, {{ creatorName }}</h1>
      <p class="page-subtitle">Creator Dashboard</p>
    </div>

    <template v-if="!isRegistered">
      <div class="card register-prompt">
        <h2>Register as a Creator</h2>
        <p>Connect your wallet and register to start creating subscription plans.</p>
        <router-link to="/creator/plans" class="btn btn-primary">Get Started</router-link>
      </div>
    </template>

    <template v-else-if="loading">
      <div class="stats-grid">
        <div class="card stat-skeleton" v-for="i in 3" :key="i">
          <LoadingSkeleton variant="stat" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="stats-grid">
        <StatCard label="Total Plans" :value="totalPlans" />
        <StatCard label="Active Plans" :value="activePlans" />
        <StatCard label="Plans Created" :value="totalPlans" />
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

.register-prompt {
  padding: 40px;
  text-align: center;
  animation: scale-in 0.4s var(--ease-spring);
}

.register-prompt h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.register-prompt p {
  margin: 0 0 20px;
  color: var(--text-secondary);
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
</style>
