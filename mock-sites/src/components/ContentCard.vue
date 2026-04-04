<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  title: string;
  description: string;
  category: string;
  locked: boolean;
  index: number;
}>();

const delay = computed(() => `${props.index * 80}ms`);
</script>

<template>
  <article
    :class="['content-card', 'card', { locked, unlocking: !locked }]"
    :style="{ '--card-delay': delay }"
  >
    <div class="card-image">
      <div class="image-placeholder">
        <svg v-if="locked" class="lock-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else class="unlock-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" />
          <path d="M8 11V7a4 4 0 017.83-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
    </div>
    <div class="card-body">
      <span class="card-category">{{ category }}</span>
      <h3 class="card-title">{{ title }}</h3>
      <p class="card-desc">{{ description }}</p>
      <span v-if="locked" class="card-lock-label">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        Subscribers only
      </span>
      <span v-else class="card-read">Read article &rarr;</span>
    </div>
  </article>
</template>

<style scoped>
.content-card {
  overflow: hidden;
  animation: card-enter 0.5s var(--ease-decel) var(--card-delay, 0ms) both;
  cursor: default;
}

.content-card.locked {
  filter: blur(6px);
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

.content-card.unlocking {
  animation: card-enter 0.5s var(--ease-decel) var(--card-delay, 0ms) both,
             unblur 0.6s var(--ease-decel) var(--card-delay, 0ms) both;
}

.card-image {
  height: 160px;
  position: relative;
  overflow: hidden;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    var(--accent-soft) 0%,
    color-mix(in srgb, var(--accent) 12%, var(--bg-primary) 88%) 50%,
    var(--accent-soft) 100%
  );
  background-size: 200% 200%;
  animation: gradient-shift 6s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-icon {
  color: var(--accent);
  opacity: 0.5;
}

.unlock-icon {
  color: var(--accent);
  opacity: 0.3;
}

.card-body {
  padding: 20px;
}

.card-category {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-text);
  margin-bottom: 8px;
}

.card-title {
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.card-desc {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.card-lock-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.card-read {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent-text);
  transition: color 0.15s ease;
}

.content-card:not(.locked):hover .card-read {
  color: var(--accent);
}

.content-card:not(.locked) {
  cursor: pointer;
  transition: box-shadow 0.25s ease, transform 0.25s var(--ease-decel);
}

.content-card:not(.locked):hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
}
</style>
