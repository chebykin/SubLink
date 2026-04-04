import { createAppKit } from "@reown/appkit/vue";
import { baseSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { SITE_NAME, THEME_COLOR, THEME_MIX } from "./lib/constants";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "PLACEHOLDER";

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: SITE_NAME,
    description: `${SITE_NAME} — powered by SubLink`,
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons: [],
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": THEME_COLOR,
    "--w3m-color-mix": THEME_MIX,
    "--w3m-color-mix-strength": 10 as number,
  },
  features: {
    email: false,
    socials: false,
  },
});

// Override AppKit accent tokens for consistent theming
const tag = document.createElement("style");
tag.id = "mock-appkit-theme";
tag.textContent = `:root {
  --apkt-tokens-core-backgroundAccentPrimary: ${THEME_COLOR} !important;
  --apkt-tokens-core-iconAccentPrimary: ${THEME_COLOR} !important;
  --apkt-tokens-core-borderAccentPrimary: ${THEME_COLOR} !important;
  --apkt-tokens-core-textAccentPrimary: ${THEME_COLOR} !important;
}`;
document.head.appendChild(tag);
