import { watch, onUnmounted, type Ref } from "vue";

/**
 * Observes `.card-reveal` children of a container element and adds
 * `.revealed` class when they enter the viewport.
 *
 * Uses `watch` instead of `onMounted` so it works when the container
 * is inside a conditional block (v-if/v-else) that renders after async data loads.
 */
export function useReveal(containerRef: Ref<HTMLElement | null>) {
  let observer: IntersectionObserver | null = null;

  function setup(el: HTMLElement) {
    cleanup();
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    const cards = el.querySelectorAll(".card-reveal");
    cards.forEach((card) => observer!.observe(card));
  }

  function cleanup() {
    observer?.disconnect();
    observer = null;
  }

  watch(
    containerRef,
    (el) => {
      if (el) {
        // Wait one tick for children to render
        requestAnimationFrame(() => setup(el));
      } else {
        cleanup();
      }
    },
    { immediate: true },
  );

  onUnmounted(cleanup);
}
