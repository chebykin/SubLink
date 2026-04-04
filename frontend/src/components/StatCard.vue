<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    value: number | string;
    suffix?: string;
    animate?: boolean;
  }>(),
  { animate: true, suffix: "" },
);

const displayed = ref(props.animate && typeof props.value === "number" ? 0 : props.value);
const landed = ref(false);
let animId = 0; // Monotonic ID to cancel stale rAF loops

function countUp(from: number, target: number, duration = 800) {
  landed.value = false;
  const thisId = ++animId;
  const start = performance.now();
  function step(now: number) {
    if (thisId !== animId) return; // Cancelled by a newer countUp call
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    displayed.value = Math.round(from + (target - from) * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Force animation replay by toggling landed off then on across frames
      nextTick(() => { landed.value = true; });
    }
  }
  requestAnimationFrame(step);
}

onMounted(() => {
  if (props.animate && typeof props.value === "number") {
    countUp(0, props.value);
  }
});

watch(
  () => props.value,
  (v) => {
    if (props.animate && typeof v === "number") {
      const from = typeof displayed.value === "number" ? displayed.value : 0;
      countUp(from, v);
    } else {
      displayed.value = v;
    }
  },
);
</script>

<template>
  <div class="stat-card card">
    <p class="stat-label">{{ label }}</p>
    <p class="stat-value" :class="{ landed }">{{ displayed }}{{ suffix }}</p>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 20px 24px;
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, var(--accent), var(--accent-hover)) 1;
  border-image-slice: 1 0 0 0;
}

.stat-label {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  margin: 6px 0 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.stat-value.landed {
  animation: count-pulse 0.3s ease-out;
}
</style>
