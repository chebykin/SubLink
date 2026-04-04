<script setup lang="ts">
import { computed } from "vue";
import SublinkLogo from "./SublinkLogo.vue";
import ModeToggle from "./ModeToggle.vue";
import SitesDropdown from "./SitesDropdown.vue";
import { useWallet } from "../composables/useWallet";
import { useAuth } from "../composables/useAuth";
import { useMode } from "../composables/useMode";
import { useToast } from "../composables/useToast";
import { GITHUB_URL, EXPLORER_URL } from "../lib/constants";
import { truncateAddress } from "../lib/format";

defineProps<{ scrolled?: boolean }>();

const { isConnected, address, signMessage } = useWallet();
const { isAuthenticated, authKeyId, deriving, derive } = useAuth();
const { mode } = useMode();
const { add: toast } = useToast();

const showDeriveButton = computed(
  () => mode.value === "subscriber" && isConnected.value && !isAuthenticated.value,
);

async function handleDerive() {
  try {
    await derive(signMessage);
    toast("Auth key derived successfully", "success");
  } catch (e: unknown) {
    toast(`Failed to derive auth key: ${e instanceof Error ? e.message : e}`, "error");
  }
}
</script>

<template>
  <header class="topnav" :class="{ scrolled }">
    <div class="topnav-left">
      <router-link to="/" class="brand">
        <SublinkLogo :size="28" />
        <span class="brand-text">SubLink</span>
      </router-link>
    </div>

    <div class="topnav-center">
      <ModeToggle />
    </div>

    <div class="topnav-right">
      <SitesDropdown />
      <a :href="EXPLORER_URL" target="_blank" rel="noopener" class="icon-link" title="Explorer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </a>
      <a :href="GITHUB_URL" target="_blank" rel="noopener" class="icon-link" title="GitHub">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </a>

      <!-- Auth key derivation button (subscriber mode, wallet connected, not yet derived) -->
      <button v-if="showDeriveButton" class="btn btn-sm" :disabled="deriving" @click="handleDerive">
        <svg v-if="deriving" class="spinner-inline" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--text-muted)" stroke-width="2" />
          <path d="M8 2a6 6 0 016 6" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ deriving ? "Signing..." : "Derive Auth Key" }}
      </button>

      <!-- Auth key indicator -->
      <Transition name="badge">
        <span v-if="isAuthenticated" class="auth-badge" :title="`Auth Key: ${authKeyId}`">
          {{ truncateAddress(authKeyId!) }}
        </span>
      </Transition>

      <!-- Reown AppKit wallet button -->
      <appkit-button size="sm" />
    </div>
  </header>
</template>

<style scoped>
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: var(--bg-card);
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(to right, transparent, var(--border-strong), transparent) 1;
  backdrop-filter: blur(18px);
  position: sticky;
  top: 0;
  z-index: 50;
  transition: box-shadow 0.3s ease;
}

.topnav.scrolled {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.topnav-left {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-primary);
  transition: transform 0.2s var(--ease-spring);
}

.brand:hover {
  transform: scale(1.03);
}

.brand-text {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.topnav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.topnav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.icon-link:hover {
  color: var(--text-primary);
  background: var(--accent-soft);
  transform: rotate(8deg);
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: "SF Mono", "Fira Code", monospace;
  color: var(--accent);
}

.badge-enter-active {
  animation: scale-in 0.3s var(--ease-spring);
}

.badge-leave-active {
  animation: fade-in 0.15s ease reverse;
}

.spinner-inline {
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .topnav-center {
    position: static;
    transform: none;
  }
  .topnav {
    gap: 12px;
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    padding-top: 12px;
    padding-bottom: 12px;
  }
}
</style>
