<script setup lang="ts">
import { SITE_NAME, SUBSCRIBE_URL } from "../lib/constants";
import StatusPill from "./StatusPill.vue";

defineProps<{
  status: string;
}>();
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-left">
        <div class="site-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M10 12C10 10 12 8 16 8C20 8 22 10 22 12C22 14 20 15 16 15C12 15 10 16 10 18C10 20 12 22 16 22C20 22 22 20 22 18" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" />
          </svg>
          <span class="site-name">{{ SITE_NAME }}</span>
        </div>
      </div>
      <div class="topbar-center">
        <StatusPill :status="status" />
      </div>
      <div class="topbar-right">
        <a :href="SUBSCRIBE_URL" class="nav-link" target="_blank" rel="noreferrer">SubLink</a>
        <appkit-button size="sm" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  animation: slide-down 0.3s var(--ease-decel);
}

.topbar-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.topbar-center {
  display: flex;
  align-items: center;
}

.topbar-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.site-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.site-name {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link:hover {
  color: var(--accent-text);
  background: var(--accent-soft);
}

@media (max-width: 640px) {
  .topbar-inner {
    padding: 0 16px;
  }

  .topbar-center {
    display: none;
  }

  .nav-link {
    display: none;
  }
}
</style>
