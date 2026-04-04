<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useMode } from "../composables/useMode";

const props = withDefaults(defineProps<{ size?: number }>(), { size: 32 });
const { mode } = useMode();

const drawn = ref(false);

// Unique ID prefix to avoid SVG id collisions when multiple instances render
const uid = ref(`sl-${Math.random().toString(36).slice(2, 8)}`);

const colors = computed(() =>
  mode.value === "creator"
    ? { from: "#e8c453", to: "#f0d06b", glow: "rgba(232,196,83,0.4)" }
    : { from: "#53b1e8", to: "#6ec1f0", glow: "rgba(83,177,232,0.4)" },
);

onMounted(() => {
  requestAnimationFrame(() => {
    drawn.value = true;
  });
});
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="logo"
  >
    <defs>
      <linearGradient :id="`${uid}-grad`" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop :stop-color="colors.from">
          <animate attributeName="stop-color" :values="`${colors.from};${colors.to};${colors.from}`" dur="3s" repeatCount="indefinite" />
        </stop>
        <stop offset="1" :stop-color="colors.to">
          <animate attributeName="stop-color" :values="`${colors.to};${colors.from};${colors.to}`" dur="3s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      <filter :id="`${uid}-glow`">
        <feGaussianBlur stdDeviation="2" result="blur1" />
        <feGaussianBlur stdDeviation="4" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <!-- Two interlocking chain links forming an S -->
    <g :filter="`url(#${uid}-glow)`" :stroke="`url(#${uid}-grad)`" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="links">
      <!-- Top link: left curve (~34u), horizontal (~20u), right curve (~34u) -->
      <path d="M22 16 C16 16, 14 20, 14 24 C14 28, 16 32, 22 32" :class="{ drawn }" style="--dash: 36; --draw-delay: 0ms" />
      <path d="M22 16 L42 16" :class="{ drawn }" style="--dash: 22; --draw-delay: 80ms" />
      <path d="M42 16 C48 16, 50 20, 50 24 C50 28, 48 32, 42 32" :class="{ drawn }" style="--dash: 36; --draw-delay: 160ms" />
      <!-- Bottom link: right curve (~34u), horizontal (~20u), left curve (~34u) -->
      <path d="M42 48 C48 48, 50 44, 50 40 C50 36, 48 32, 42 32" :class="{ drawn }" style="--dash: 36; --draw-delay: 240ms" />
      <path d="M42 48 L22 48" :class="{ drawn }" style="--dash: 22; --draw-delay: 320ms" />
      <path d="M22 48 C16 48, 14 44, 14 40 C14 36, 16 32, 22 32" :class="{ drawn }" style="--dash: 36; --draw-delay: 400ms" />
    </g>
  </svg>
</template>

<style scoped>
.logo {
  transition: filter 0.6s ease;
  animation: glow-pulse 4s ease-in-out infinite;
}

.logo:hover {
  filter: drop-shadow(0 0 6px var(--accent-soft));
}

.links path {
  stroke-dasharray: var(--dash);
  stroke-dashoffset: var(--dash);
}

.links path.drawn {
  animation: draw-path 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
  animation-delay: var(--draw-delay);
}
</style>
