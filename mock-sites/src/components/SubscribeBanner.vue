<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSubscribeModal } from "../composables/useSubscribeModal";

const visible = ref(false);
const { openModal } = useSubscribeModal();

onMounted(() => {
  setTimeout(() => {
    visible.value = true;
  }, 1500);
});
</script>

<template>
  <Transition name="banner">
    <div v-if="visible" class="banner">
      <div class="banner-inner">
        <div class="banner-text">
          <svg class="banner-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span>Get access to exclusive content</span>
        </div>
        <button type="button" class="btn btn-banner" @click="openModal">
          Subscribe
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
}

.banner-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.banner-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
}

.banner-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.btn-banner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  border-radius: var(--radius-pill);
  border: none;
  background: var(--accent);
  color: white;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
}

.btn-banner:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent 70%);
}

.banner-enter-active {
  animation: slide-up 0.4s var(--ease-decel);
}

.banner-leave-active {
  animation: slide-up 0.2s ease reverse;
}

@media (max-width: 640px) {
  .banner-inner {
    padding: 12px 16px;
  }

  .banner-text span {
    font-size: 0.8125rem;
  }
}
</style>
