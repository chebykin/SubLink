<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";
import TopNav from "./components/TopNav.vue";
import SideNav from "./components/SideNav.vue";
import ToastContainer from "./components/ToastContainer.vue";
import ConnectWalletPrompt from "./components/ConnectWalletPrompt.vue";
import { useMode } from "./composables/useMode";
import { useWallet } from "./composables/useWallet";

const { mode } = useMode();
const { isConnected } = useWallet();
const router = useRouter();

// Navigate to mode root when mode toggles
watch(mode, (m) => {
  const path = router.currentRoute.value.path;
  const prefix = m === "creator" ? "/creator" : "/subscriber";
  if (!path.startsWith(prefix)) {
    router.push(prefix);
  }
});
</script>

<template>
  <TopNav />
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
