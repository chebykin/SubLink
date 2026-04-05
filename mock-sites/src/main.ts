import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { Buffer } from "buffer";

import App from "./App.vue";
import "./wallet-config";
import "./style.css";

// Polyfill global Buffer for @zk-kit/eddsa-poseidon (bundled inside
// @unlink-xyz/sdk) — it still uses an unqualified `Buffer.from` on its
// blake2b digest path. Dev happens to work, prod bundles don't.
if (typeof globalThis.Buffer === "undefined") {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

const themeColor = import.meta.env.VITE_THEME_COLOR || "#8B6914";
const themeMix = import.meta.env.VITE_THEME_MIX || "#F5F0E6";
const siteName = import.meta.env.VITE_SITE_NAME || "Creator Site";

// Set the accent color — all derived vars (--accent-hover, --accent-soft, etc.)
// are defined via color-mix(var(--accent), ...) in style.css and update automatically.
document.documentElement.style.setProperty("--accent", themeColor);

// Theme-color meta tag
const metaTheme = document.querySelector('meta[name="theme-color"]');
if (metaTheme) metaTheme.setAttribute("content", themeMix);

document.title = `${siteName} | SubLink`;

const app = createApp(App);
app.use(VueQueryPlugin);
app.mount("#app");
