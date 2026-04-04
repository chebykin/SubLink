<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "../composables/useToast";

const props = defineProps<{
  text: string;
  label?: string;
}>();

const { add: toast } = useToast();
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    copied.value = true;
    toast(props.label ? `${props.label} copied` : "Copied to clipboard", "success");
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    toast("Failed to copy", "error");
  }
}
</script>

<template>
  <button class="copy-btn" :title="copied ? 'Copied!' : 'Copy'" @click.stop="copy">
    <svg v-if="!copied" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
    </svg>
    <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check">
      <path d="M3 8l4 4 6-7" />
    </svg>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
  background: var(--accent-soft);
}

.check {
  color: var(--success);
  animation: scale-in 0.2s var(--ease-spring);
}
</style>
