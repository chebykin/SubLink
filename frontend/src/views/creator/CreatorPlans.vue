<script setup lang="ts">
import { ref, watch } from "vue";
import StatusBadge from "../../components/StatusBadge.vue";
import EmptyState from "../../components/EmptyState.vue";
import CreatorSignInPrompt from "../../components/CreatorSignInPrompt.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useCreator } from "../../composables/useCreator";
import { useToast } from "../../composables/useToast";
import { useReveal } from "../../composables/useReveal";
import * as api from "../../lib/api";
import type { Plan } from "../../lib/types";
import { formatUsdcDisplay, formatInterval } from "../../lib/format";

const { stored, creatorId, isRegistered } = useCreator();
const { add: toast } = useToast();

const plans = ref<Plan[]>([]);
const loading = ref(true);
const showForm = ref(false);
const creating = ref(false);
const plansRef = ref<HTMLElement | null>(null);

useReveal(plansRef);

// Plan form
const form = ref({
  name: "",
  amount: "",
  intervalSeconds: 2592000,
  description: "",
  spendingCap: "0",
});

const intervals = [
  { label: "1 minute (demo)", value: 60 },
  { label: "5 minutes (demo)", value: 300 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
];

let plansLoadToken = 0;

async function loadPlans(nextCreatorId: string) {
  const loadToken = ++plansLoadToken;
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
}

watch(
  creatorId,
  async (nextCreatorId) => {
    plansLoadToken += 1;
    plans.value = [];
    showForm.value = false;

    if (!nextCreatorId) {
      loading.value = false;
      return;
    }

    await loadPlans(nextCreatorId);
  },
  { immediate: true },
);

async function handleCreate() {
  if (!form.value.name.trim() || !form.value.amount) {
    toast("Please fill in plan name and price", "error");
    return;
  }
  creating.value = true;
  try {
    const amountAtomic = String(Math.round(parseFloat(form.value.amount) * 1e6));
    const capAtomic = form.value.spendingCap && form.value.spendingCap !== "0"
      ? String(Math.round(parseFloat(form.value.spendingCap) * 1e6))
      : "0";
    await api.createPlan({
      creatorId: stored.value!.id,
      name: form.value.name.trim(),
      amount: amountAtomic,
      intervalSeconds: form.value.intervalSeconds,
      description: form.value.description.trim() || undefined,
      spendingCap: capAtomic,
    });
    toast("Plan created!", "success");
    form.value = { name: "", amount: "", intervalSeconds: 2592000, description: "", spendingCap: "0" };
    showForm.value = false;
    if (creatorId.value) {
      await loadPlans(creatorId.value);
    }
  } catch (e: unknown) {
    toast(`Failed to create plan: ${api.getErrorMessage(e)}`, "error");
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="page">
    <CreatorSignInPrompt v-if="!isRegistered" />

    <template v-else>
    <div class="page-header">
      <div>
        <h1 class="page-title">Plans</h1>
        <p class="page-subtitle">Create and manage subscription plans</p>
      </div>
      <button class="btn btn-primary toggle-btn" @click="showForm = !showForm">
        <span class="toggle-icon" :class="{ open: showForm }">+</span>
        {{ showForm ? "Cancel" : "New Plan" }}
      </button>
    </div>

    <!-- Create plan form -->
    <Transition name="panel">
      <div v-if="showForm" class="card form-card">
        <h2 class="form-title">Create Plan</h2>
        <form @submit.prevent="handleCreate" class="form">
          <div class="field">
            <label>Plan Name</label>
            <input v-model="form.name" type="text" placeholder="Pro Plan" class="input" required />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Price (USDC)</label>
              <input v-model="form.amount" type="number" step="0.001" min="0.001" placeholder="5.00" class="input" required />
            </div>
            <div class="field">
              <label>Billing Interval</label>
              <select v-model="form.intervalSeconds" class="input">
                <option v-for="iv in intervals" :key="iv.value" :value="iv.value">{{ iv.label }}</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Description <span class="optional">(optional)</span></label>
            <textarea v-model="form.description" placeholder="What subscribers get..." class="input textarea" rows="2" />
          </div>
          <div class="field">
            <label>Spending Cap (USDC) <span class="optional">0 = unlimited</span></label>
            <input v-model="form.spendingCap" type="number" step="0.001" min="0" placeholder="0" class="input" />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="creating">
            {{ creating ? "Creating..." : "Create Plan" }}
          </button>
        </form>
      </div>
    </Transition>

    <!-- Plans list -->
    <div v-if="loading" class="plans-grid">
      <div class="card" v-for="i in 3" :key="i" style="padding: 24px">
        <LoadingSkeleton :lines="3" />
      </div>
    </div>

    <div v-else-if="plans.length === 0">
      <EmptyState title="No plans yet" description="Create your first subscription plan to start earning." />
    </div>

    <div v-else ref="plansRef" class="plans-grid">
      <router-link
        v-for="(plan, i) in plans"
        :key="plan.id"
        :to="`/creator/plans/${plan.id}`"
        class="plan-card card card-reveal"
        :style="{ transitionDelay: `${i * 80}ms` }"
      >
        <div class="plan-header">
          <h3 class="plan-name">{{ plan.name }}</h3>
          <StatusBadge :status="plan.active ? 'active' : 'completed'" />
        </div>
        <p class="plan-price">{{ formatUsdcDisplay(plan.amount) }}</p>
        <p class="plan-interval">every {{ formatInterval(plan.intervalSeconds) }}</p>
        <p v-if="plan.description" class="plan-desc">{{ plan.description }}</p>
      </router-link>
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
  margin-bottom: 28px;
}

.toggle-btn {
  gap: 6px;
}

.toggle-icon {
  display: inline-block;
  font-size: 1.1em;
  font-weight: 700;
  transition: transform 0.25s var(--ease-spring);
}

.toggle-icon.open {
  transform: rotate(45deg);
}

.form-card {
  padding: 28px;
  margin-bottom: 28px;
}

.form-title {
  margin: 0 0 4px;
  font-size: 1.125rem;
  font-weight: 600;
}

.form-desc {
  margin: 0 0 20px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.plan-card {
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.plan-card:hover {
  transform: translateY(-2px);
}

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.plan-name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}

.plan-card:hover {
  border-left: 3px solid var(--accent);
}

.plan-price {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.plan-interval {
  margin: 2px 0 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.plan-desc {
  margin: 12px 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>
