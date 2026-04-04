<script setup lang="ts">
import { ref } from "vue";
import { useMode } from "../composables/useMode";

const { mode, toggle } = useMode();
const pulsing = ref(false);

function handleToggle() {
  pulsing.value = true;
  toggle();
  setTimeout(() => { pulsing.value = false; }, 200);
}
</script>

<template>
  <button class="toggle" :class="[mode, { pulsing }]" @click="handleToggle" :title="`Switch to ${mode === 'creator' ? 'subscriber' : 'creator'} mode`">
    <span class="toggle-track">
      <span class="toggle-ghost" />
      <span class="toggle-thumb" />
    </span>
    <span class="toggle-labels">
      <span class="toggle-label" :class="{ active: mode === 'creator' }">Creator</span>
      <span class="toggle-label" :class="{ active: mode === 'subscriber' }">Subscriber</span>
    </span>
  </button>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-primary);
  font-family: inherit;
  transition: transform 0.15s ease;
}

.toggle.pulsing {
  transform: scale(0.96);
}

.toggle-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: background 0.4s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.toggle.pulsing .toggle-track {
  box-shadow: 0 0 12px var(--accent-soft);
  border-color: var(--accent);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  transition: transform 0.3s var(--ease-bounce);
  box-shadow: 0 2px 8px var(--accent-soft);
  z-index: 1;
}

/* Ghost trails behind the thumb with a delay */
.toggle-ghost {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.25;
  transition: transform 0.45s var(--ease-spring);
}

.subscriber .toggle-thumb {
  transform: translateX(20px);
}

.subscriber .toggle-ghost {
  transform: translateX(20px);
}

.toggle-labels {
  display: flex;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.toggle-label {
  color: var(--text-muted);
  transition: color 0.3s ease, transform 0.2s ease;
}

.toggle-label.active {
  color: var(--accent);
}
</style>
