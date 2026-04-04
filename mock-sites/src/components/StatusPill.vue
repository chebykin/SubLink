<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: string;
}>();

const config = computed(() => {
  switch (props.status) {
    case "deriving":
      return { label: "Signing...", cls: "pill-neutral", dot: false, spin: true };
    case "checking":
      return { label: "Verifying access...", cls: "pill-neutral", dot: false, spin: true };
    case "verified":
      return { label: "Access Verified", cls: "pill-success", dot: true, spin: false };
    case "not-subscribed":
      return { label: "Subscription Required", cls: "pill-accent", dot: false, spin: false };
    case "error":
      return { label: "Error", cls: "pill-danger", dot: false, spin: false };
    default:
      return null;
  }
});
</script>

<template>
  <Transition name="pill">
    <span v-if="config" :class="['pill', config.cls]" class="status-pill">
      <span v-if="config.spin" class="spinner spinner-sm" />
      <span v-if="config.dot" class="dot" />
      {{ config.label }}
    </span>
  </Transition>
</template>

<style scoped>
.status-pill {
  animation: scale-in 0.3s var(--ease-spring);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s ease-in-out infinite;
}

.pill-danger {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.pill-enter-active {
  animation: scale-in 0.3s var(--ease-spring);
}

.pill-leave-active {
  animation: fade-in 0.15s ease reverse;
}
</style>
