<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import TopNav from "./components/TopNav.vue";
import SideNav from "./components/SideNav.vue";
import ToastContainer from "./components/ToastContainer.vue";
import ProgressBar from "./components/ProgressBar.vue";
import ConnectWalletPrompt from "./components/ConnectWalletPrompt.vue";
import { useCreator } from "./composables/useCreator";
import { useMode } from "./composables/useMode";
import { useToast } from "./composables/useToast";
import { useWallet } from "./composables/useWallet";
import { getErrorMessage } from "./lib/api";

const { mode } = useMode();
const { address, isConnected, signMessage } = useWallet();
const { loadFromWallet, clear: clearCreator } = useCreator();
const { add: toast } = useToast();
const router = useRouter();
const scrolled = ref(false);
let creatorSyncToken = 0;

function isUserRejectedCreatorRefresh(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("user rejected") ||
    message.includes("rejected the request") ||
    message.includes("user denied")
  );
}

function onScroll() {
  scrolled.value = window.scrollY > 2;
}

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", onScroll));

// Navigate to mode root when mode toggles
watch(mode, (m) => {
  const path = router.currentRoute.value.path;
  const prefix = m === "creator" ? "/creator" : "/subscriber";
  if (!path.startsWith(prefix)) {
    router.push(prefix);
  }
});

watch(
  () => address.value,
  (nextAddress, prevAddress) => {
    const addressChanged = nextAddress !== (prevAddress ?? null);
    const syncToken = ++creatorSyncToken;

    if (addressChanged) {
      clearCreator();
    }

    if (!nextAddress) {
      return;
    }

    // Only auto-load the creator profile when the wallet address actually
    // changed (including first connect). Mode toggles do not trigger a new
    // signature prompt — users can click "Load Existing Profile" manually.
    if (!addressChanged || mode.value !== "creator") {
      return;
    }

    void (async () => {
      try {
        await loadFromWallet(signMessage);
      } catch (error) {
        if (syncToken !== creatorSyncToken) {
          return;
        }

        if (isUserRejectedCreatorRefresh(error)) {
          return;
        }

        toast(`Could not refresh creator identity: ${getErrorMessage(error)}`, "error");
      }
    })();
  },
  { immediate: true },
);
</script>

<template>
  <ProgressBar />
  <TopNav :scrolled="scrolled" />
  <div class="layout">
    <SideNav />
    <main class="content">
      <template v-if="isConnected">
        <router-view v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </template>
      <ConnectWalletPrompt v-else />
    </main>
  </div>
  <ToastContainer />
</template>

<style scoped>
.layout {
  display: flex;
  min-height: calc(100vh - 60px);
}

.content {
  flex: 1;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }
  .content {
    padding: 20px 16px;
  }
}
</style>
