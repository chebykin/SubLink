<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty">
    <div class="empty-container">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p v-if="description" class="empty-desc">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  animation: fade-in 0.3s ease-out;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 32px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  max-width: 400px;
}

.empty-icon {
  color: var(--text-muted);
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.empty-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--text-primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-desc {
  margin: 8px 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 320px;
}
</style>
