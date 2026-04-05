<script setup lang="ts">
import { watch } from "vue";
import { useWallet } from "./composables/useWallet";
import { useAccess } from "./composables/useAccess";
import TopBar from "./components/TopBar.vue";
import HeroSection from "./components/HeroSection.vue";
import ContentGrid from "./components/ContentGrid.vue";
import AccessGate from "./components/AccessGate.vue";
import SubscribeBanner from "./components/SubscribeBanner.vue";
import SublinkBadge from "./components/SublinkBadge.vue";
import SubscribeModal from "./components/SubscribeModal.vue";
import ToastContainer from "./components/ToastContainer.vue";

const { isConnected } = useWallet();
const { accessState, planInfo, hasAccess, checkAccess } = useAccess();

// Auto-check access when wallet connects
watch(isConnected, (connected) => {
  if (connected && accessState.value === "idle") {
    checkAccess();
  }
});

function openConnect() {
  const btn = document.querySelector("appkit-button");
  if (btn) (btn as HTMLElement).click();
}
</script>

<template>
  <TopBar :status="accessState" />

  <main class="main-content">
    <HeroSection :status="accessState" :plan-info="planInfo" />

    <ContentGrid :unlocked="hasAccess" />

    <AccessGate
      v-if="accessState === 'idle' || accessState === 'not-subscribed'"
      :plan-info="planInfo"
      :is-connected="isConnected"
      :on-connect="openConnect"
    />
  </main>

  <SubscribeBanner v-if="!hasAccess" />
  <SublinkBadge />
  <SubscribeModal />
  <ToastContainer />
</template>

<style scoped>
.main-content {
  flex: 1;
}
</style>
