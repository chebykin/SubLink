import { ref } from "vue";

const open = ref(false);

export function useSubscribeModal() {
  function openModal() {
    open.value = true;
  }
  function closeModal() {
    open.value = false;
  }
  return { open, openModal, closeModal };
}
