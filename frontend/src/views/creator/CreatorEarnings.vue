<script setup lang="ts">
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Earnings</h1>
      <p class="page-subtitle">Track your subscription revenue</p>
    </div>

    <div class="coming-soon-wrap">
      <!-- Blurred mockup chart + table -->
      <div class="mockup-content">
        <!-- Fake chart area -->
        <div class="mockup-chart card">
          <div class="chart-bars">
            <div class="chart-bar" v-for="i in 7" :key="i" :style="{ height: `${20 + Math.sin(i * 1.2) * 30 + 30}%` }" />
          </div>
        </div>
        <!-- Fake table -->
        <div class="mockup-table card">
          <div class="mockup-row" v-for="i in 4" :key="i">
            <div class="skeleton" style="width: 80px; height: 12px" />
            <div class="skeleton" style="width: 60px; height: 12px" />
            <div class="skeleton" style="width: 50px; height: 20px; border-radius: 20px" />
            <div class="skeleton" style="width: 70px; height: 12px" />
          </div>
        </div>
      </div>

      <!-- Overlay -->
      <div class="coming-soon-overlay">
        <div class="overlay-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="overlay-title">Coming Soon</h3>
        <p class="overlay-desc">Creator earnings dashboard will be available in a future update.</p>
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

.mockup-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  filter: blur(4px);
  opacity: 0.4;
  pointer-events: none;
}

.mockup-chart {
  padding: 24px;
  height: 180px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 100%;
}

.chart-bar {
  flex: 1;
  background: var(--accent-soft);
  border-radius: 4px 4px 0 0;
  min-height: 20%;
}

.mockup-table {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mockup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
