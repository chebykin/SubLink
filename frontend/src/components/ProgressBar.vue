<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const active = ref(false);
const complete = ref(false);

let removeBeforeEach: (() => void) | null = null;
let removeAfterEach: (() => void) | null = null;

onMounted(() => {
  removeBeforeEach = router.beforeEach(() => {
    active.value = true;
    complete.value = false;
  });
  removeAfterEach = router.afterEach(() => {
    complete.value = true;
    setTimeout(() => {
      active.value = false;
      complete.value = false;
    }, 300);
  });
});

onUnmounted(() => {
  removeBeforeEach?.();
  removeAfterEach?.();
});
</script>

<template>
  <div v-if="active" :class="['progress-bar', { complete }]" />
</template>

<style scoped>
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--accent);
  z-index: 200;
  width: 70%;
  animation: progress-grow 0.8s ease-out;
  box-shadow: 0 0 8px var(--accent-soft);
}

.progress-bar.complete {
  width: 100%;
  transition: width 0.2s ease;
  opacity: 0;
  transition: width 0.2s ease, opacity 0.2s ease 0.1s;
}

@keyframes progress-grow {
  from { width: 0%; }
  to { width: 70%; }
}
</style>
