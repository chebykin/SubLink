<script setup lang="ts">
import { computed } from "vue";
import { useMode } from "../composables/useMode";

const { mode } = useMode();

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const creatorItems: NavItem[] = [
  { label: "Dashboard", to: "/creator", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Plans", to: "/creator/plans", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Subscribers", to: "/creator/subscriptions", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { label: "Earnings", to: "/creator/earnings", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const subscriberItems: NavItem[] = [
  { label: "Dashboard", to: "/subscriber", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Subscriptions", to: "/subscriber/subscriptions", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
];

const items = computed(() => (mode.value === "creator" ? creatorItems : subscriberItems));
const totalItems = computed(() => items.value.length);
</script>

<template>
  <nav class="sidenav">
    <TransitionGroup name="nav-item" tag="ul" class="nav-list">
      <li v-for="(item, i) in items" :key="item.to" :style="{ '--i': i, '--total': totalItems }">
        <router-link :to="item.to" class="nav-link" :class="{ 'nav-link--active': $route.path === item.to }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </li>
    </TransitionGroup>
  </nav>
</template>

<style scoped>
.sidenav {
  width: 220px;
  min-height: calc(100vh - 60px);
  padding: 16px 12px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  backdrop-filter: blur(18px);
  transition: background 0.5s ease;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.15s ease, background 0.15s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--accent-soft);
}

.nav-link--active {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}

.nav-link--active::before {
  content: "";
  position: absolute;
  left: -2px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
  animation: fade-in 0.2s ease-out;
}

/* staggered spring slide-in animation */
.nav-item-enter-active {
  animation: stagger-slide-in 0.3s var(--ease-spring) both;
  animation-delay: calc(var(--i) * 60ms);
}

.nav-item-leave-active {
  animation: stagger-slide-in 0.2s ease-in reverse both;
  animation-delay: calc((var(--total) - var(--i) - 1) * 40ms);
}

@media (max-width: 768px) {
  .sidenav {
    width: 100%;
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .nav-list {
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }
  .nav-list li {
    scroll-snap-align: start;
  }
  .nav-link {
    white-space: nowrap;
  }
  .nav-link--active::before {
    display: none;
  }
}
</style>
