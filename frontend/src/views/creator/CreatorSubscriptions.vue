<script setup lang="ts">
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Subscribers</h1>
      <p class="page-subtitle">View subscriptions to your plans</p>
    </div>

    <div class="coming-soon-wrap">
      <!-- Blurred mockup grid -->
      <div class="mockup-grid">
        <div class="mockup-card card" v-for="i in 3" :key="i">
          <div class="mockup-row">
            <div class="skeleton" style="width: 120px; height: 16px" />
            <div class="skeleton" style="width: 60px; height: 22px; border-radius: 20px" />
          </div>
          <div class="mockup-details">
            <div class="skeleton" style="width: 80px; height: 12px" />
            <div class="skeleton" style="width: 100px; height: 12px" />
            <div class="skeleton" style="width: 70px; height: 12px" />
          </div>
        </div>
      </div>

      <!-- Overlay -->
      <div class="coming-soon-overlay">
        <div class="overlay-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="overlay-title">Coming Soon</h3>
        <p class="overlay-desc">Creator-scoped subscriber listing will be available in a future update.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  animation: card-enter 0.3s var(--ease-decel);
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.coming-soon-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.mockup-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  filter: blur(4px);
  opacity: 0.4;
  pointer-events: none;
}

.mockup-card {
  padding: 20px 24px;
}

.mockup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.mockup-details {
  display: flex;
  gap: 24px;
}

.coming-soon-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
}

.overlay-icon {
  color: var(--accent);
  animation: float 3s ease-in-out infinite;
  margin-bottom: 4px;
}

.overlay-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.overlay-desc {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  max-width: 300px;
}
</style>
