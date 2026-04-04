import { ref } from "vue";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  leaving?: boolean;
}

let nextId = 0;
const toasts = ref<Toast[]>([]);

export function useToast() {
  function add(message: string, type: Toast["type"] = "info", durationMs = 4000) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => dismiss(id), durationMs);
  }

  function dismiss(id: number) {
    const t = toasts.value.find((t) => t.id === id);
    if (t) {
      t.leaving = true;
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id);
      }, 200);
    }
  }

  return { toasts, add, dismiss };
}
