import { ref, watch } from "vue";
import type { Mode } from "../lib/types";

const STORAGE_KEY = "sublink-mode";

function loadMode(): Mode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "creator" || stored === "subscriber" ? stored : "creator";
}

const mode = ref<Mode>(loadMode());

watch(mode, (v) => {
  localStorage.setItem(STORAGE_KEY, v);
  document.body.className = `theme-${v}`;
});

// Initialize body class
document.body.className = `theme-${mode.value}`;

export function useMode() {
  function toggle() {
    mode.value = mode.value === "creator" ? "subscriber" : "creator";
  }

  function setMode(m: Mode) {
    mode.value = m;
  }

  return { mode, toggle, setMode };
}
