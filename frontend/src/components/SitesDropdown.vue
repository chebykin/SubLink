<script setup lang="ts">
import { ref } from "vue";
import { CREATOR_1_URL, CREATOR_2_URL } from "../lib/constants";

const open = ref(false);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}
</script>

<template>
  <div class="dropdown" @mouseleave="close">
    <button class="dropdown-trigger btn-sm" @click="toggle">
      Creators
      <svg class="chevron" :class="{ rotated: open }" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="open" class="dropdown-menu">
        <a :href="CREATOR_1_URL" target="_blank" rel="noopener" class="dropdown-item" @click="close">
          Creator 1
        </a>
        <a :href="CREATOR_2_URL" target="_blank" rel="noopener" class="dropdown-item" @click="close">
          Creator 2
        </a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.dropdown-trigger:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.chevron {
  transition: transform 0.2s var(--ease-decel);
}

.chevron.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 140px;
  padding-top: 6px;
  z-index: 100;
  transform-origin: top right;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--accent-soft), 0 12px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
}

.dropdown-item {
  display: block;
  padding: 6px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  border-radius: var(--radius-sm);
  transition: all 0.12s ease;
  margin: 2px 4px;
}

.dropdown-item:hover {
  color: var(--text-primary);
  background: var(--accent-soft);
}

.dropdown-enter-active {
  animation: dropdown-in 0.2s var(--ease-decel);
}
.dropdown-leave-active {
  animation: dropdown-in 0.15s ease-in reverse;
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
