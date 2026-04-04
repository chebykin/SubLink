<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import StatusBadge from "../../components/StatusBadge.vue";
import StatCard from "../../components/StatCard.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingSkeleton from "../../components/LoadingSkeleton.vue";
import { useAuth } from "../../composables/useAuth";
import { useToast } from "../../composables/useToast";
import * as api from "../../lib/api";
import type { Charge } from "../../lib/types";
import { formatUsdc, formatUsdcDisplay, formatDate } from "../../lib/format";

const props = defineProps<{ subscriptionId: string }>();
const { isAuthenticated, getToken } = useAuth();
const { add: toast } = useToast();

const charges = ref<Charge[]>([]);
const loading = ref(true);

const totalAmount = computed(() => {
  const total = charges.value.reduce((sum, c) => sum + BigInt(c.amount || "0"), 0n);
  return formatUsdc(total.toString());
});

const successCount = computed(() => charges.value.filter((c) => c.status === "success").length);

onMounted(async () => {
  if (!isAuthenticated.value) {
    loading.value = false;
    return;
  }
  try {
    const token = await getToken(props.subscriptionId);
    const res = await api.getCharges(props.subscriptionId, token);
    charges.value = res.charges;
  } catch (e: unknown) {
    toast(`Failed to load charges: ${api.getErrorMessage(e)}`, "error");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <router-link to="/subscriber/subscriptions" class="back-link"><span class="back-arrow">&larr;</span> Back to Subscriptions</router-link>

    <div class="page-header">
      <h1 class="page-title">Charge History</h1>
      <p class="page-subtitle">Subscription {{ subscriptionId.slice(0, 8) }}...</p>
    </div>

    <div v-if="!loading && charges.length > 0" class="stats-grid">
      <StatCard label="Total Charges" :value="charges.length" />
      <StatCard label="Total Amount" :value="totalAmount" suffix=" USDC" :animate="false" />
      <StatCard label="Successful" :value="successCount" />
    </div>

    <div v-if="loading">
      <div class="card" style="padding: 24px">
        <LoadingSkeleton :lines="5" />
      </div>
    </div>

    <div v-else-if="charges.length === 0">
      <EmptyState title="No charges yet" description="No charges have been processed for this subscription." />
    </div>

    <div v-else class="table-wrap card">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Completed</th>
            <th>Tx</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(charge, i) in charges"
            :key="charge.id"
            class="table-row"
            :style="{ animationDelay: `${i * 40}ms` }"
          >
            <td>{{ formatDate(charge.createdAt) }}</td>
            <td class="amount">{{ formatUsdcDisplay(charge.amount) }}</td>
            <td><StatusBadge :status="charge.status" /></td>
            <td>{{ charge.completedAt ? formatDate(charge.completedAt) : "\u2014" }}</td>
            <td>
              <a
                v-if="charge.unlinkTxId"
                :href="`https://sepolia-explorer.base.org/tx/${charge.unlinkTxId}`"
                target="_blank"
                rel="noopener"
                class="tx-link"
                :title="charge.unlinkTxId"
              >
                {{ charge.unlinkTxId.slice(0, 8) }}...
              </a>
              <span v-else class="tx-na">&mdash;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  animation: card-enter 0.3s var(--ease-decel);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 20px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.15s ease;
}

.back-link:hover {
  color: var(--accent);
}

.back-arrow {
  display: inline-block;
  transition: transform 0.15s ease;
}

.back-link:hover .back-arrow {
  transform: translateX(-3px);
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
  font-family: "SF Mono", "Fira Code", monospace;
}

.table-wrap {
  overflow-x: auto;
  padding: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.table th {
  text-align: left;
  padding: 14px 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table td {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}

.table-row {
  animation: row-reveal 0.25s var(--ease-decel) both;
  transition: background 0.15s ease, transform 0.15s ease;
}

.table-row:hover {
  background: var(--bg-hover);
  transform: translateX(2px);
}

.table-row:last-child td {
  border-bottom: none;
}

.amount {
  font-weight: 600;
  color: var(--text-primary);
}

.tx-link {
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.tx-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.tx-na {
  color: var(--text-muted);
}
</style>
