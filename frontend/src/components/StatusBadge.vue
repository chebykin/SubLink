<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ status: string }>();

const variant = computed(() => {
  switch (props.status) {
    case "active":
    case "success":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
    case "cancelled_by_failure":
    case "failed":
      return "danger";
    case "completed":
      return "info";
    default:
      return "neutral";
  }
});

const label = computed(() => props.status.replace(/_/g, " "));
</script>

<template>
  <span class="badge" :class="variant">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
}

.success {
  color: #53e88a;
  background: rgba(83, 232, 138, 0.12);
  border: 1px solid rgba(83, 232, 138, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
}

.warning {
  color: #e8c453;
  background: rgba(232, 196, 83, 0.12);
  border: 1px solid rgba(232, 196, 83, 0.2);
}

.danger {
  color: #e85353;
  background: rgba(232, 83, 83, 0.12);
  border: 1px solid rgba(232, 83, 83, 0.2);
}

.info {
  color: #53b1e8;
  background: rgba(83, 177, 232, 0.12);
  border: 1px solid rgba(83, 177, 232, 0.2);
}

.neutral {
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
}
</style>
