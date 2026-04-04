<script setup lang="ts">
withDefaults(
  defineProps<{
    lines?: number;
    height?: string;
    variant?: "text" | "stat";
  }>(),
  { lines: 3, height: "16px", variant: "text" },
);
</script>

<template>
  <!-- Stat variant: small label + large value -->
  <div v-if="variant === 'stat'" class="skeleton-stat">
    <div class="skeleton" style="height: 12px; width: 60%; animation-delay: 0ms" />
    <div class="skeleton" style="height: 28px; width: 40%; animation-delay: 100ms" />
  </div>

  <!-- Text variant: lines of varying width -->
  <div v-else class="skeletons">
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton"
      :style="{
        height,
        width: i === lines ? '60%' : '100%',
        animationDelay: `${i * 100}ms`,
      }"
    />
  </div>
</template>

<style scoped>
.skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.skeleton-stat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
</style>
