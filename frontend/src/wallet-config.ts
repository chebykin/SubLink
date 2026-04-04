import { watch } from "vue";
import { createAppKit } from "@reown/appkit/vue";
import { baseSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { useMode } from "./composables/useMode";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "PLACEHOLDER";

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

function themeForMode(m: string) {
  const accent = m === "creator" ? "#e8c453" : "#53b1e8";
  const mix = m === "creator" ? "#2a2310" : "#10243e";
  return {
    "--w3m-accent": accent,
    "--w3m-color-mix": mix,
    "--w3m-color-mix-strength": 20 as number,
    "--apkt-accent": accent,
    "--apkt-color-mix": mix,
    "--apkt-color-mix-strength": 20 as number,
  };
}

function applyAccentOverride(m: string) {
  const accent = m === "creator" ? "#e8c453" : "#53b1e8";
  let tag = document.getElementById("sublink-appkit-theme");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "sublink-appkit-theme";
    document.head.appendChild(tag);
  }
  tag.textContent = `:root {
    --apkt-tokens-core-backgroundAccentPrimary: ${accent} !important;
    --apkt-tokens-core-iconAccentPrimary: ${accent} !important;
    --apkt-tokens-core-borderAccentPrimary: ${accent} !important;
    --apkt-tokens-core-textAccentPrimary: ${accent} !important;
  }`;
}

const { mode } = useMode();

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "SubLink",
    description: "Privacy-preserving subscription protocol",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons: [],
  },
  themeMode: "dark",
  themeVariables: themeForMode(mode.value),
  features: {
    email: false,
    socials: false,
  },
});

// Apply override immediately and on every mode switch
applyAccentOverride(mode.value);
watch(mode, (m) => {
  appKit.setThemeVariables(themeForMode(m));
  applyAccentOverride(m);
});
