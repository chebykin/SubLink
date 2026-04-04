<script setup lang="ts">
import { SUBSCRIBE_URL } from "../lib/constants";
</script>

<template>
  <footer class="badge-footer">
    <a :href="SUBSCRIBE_URL" class="badge-link" target="_blank" rel="noreferrer">
      <svg class="badge-logo" width="16" height="16" viewBox="0 0 32 32" fill="none">
        <path d="M10 12C10 10 12 8 16 8C20 8 22 10 22 12C22 14 20 15 16 15C12 15 10 16 10 18C10 20 12 22 16 22C20 22 22 20 22 18" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
      Powered by SubLink
    </a>
  </footer>
</template>

<style scoped>
.badge-footer {
  padding: 24px;
  text-align: center;
  margin-top: auto;
  animation: fade-in 0.5s ease 0.6s both;
}

.badge-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.badge-link:hover {
  color: var(--accent-text);
}

.badge-logo {
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.badge-link:hover .badge-logo {
  opacity: 1;
}
</style>
