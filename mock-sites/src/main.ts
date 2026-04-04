import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";

import App from "./App.vue";
import "./wallet-config";
import "./style.css";

const themeColor = import.meta.env.VITE_THEME_COLOR || "#8B6914";
const themeMix = import.meta.env.VITE_THEME_MIX || "#F5F0E6";
const siteName = import.meta.env.VITE_SITE_NAME || "Creator Site";

// Set CSS custom properties from env
document.documentElement.style.setProperty("--accent", themeColor);
document.documentElement.style.setProperty("--accent-hover", `color-mix(in srgb, ${themeColor} 80%, white 20%)`);
document.documentElement.style.setProperty("--accent-soft", `color-mix(in srgb, ${themeColor} 8%, transparent 92%)`);
document.documentElement.style.setProperty("--accent-wash", `color-mix(in srgb, ${themeColor} 4%, transparent 96%)`);
document.documentElement.style.setProperty("--accent-border", `color-mix(in srgb, ${themeColor} 18%, transparent 82%)`);
document.documentElement.style.setProperty("--accent-text", `color-mix(in srgb, ${themeColor} 85%, black 15%)`);
document.documentElement.style.setProperty("--bg-page-top", `color-mix(in srgb, ${themeColor} 6%, #FAFAF9 94%)`);

// Theme-color meta tag
const metaTheme = document.querySelector('meta[name="theme-color"]');
if (metaTheme) metaTheme.setAttribute("content", themeMix);

document.title = `${siteName} | SubLink`;

const app = createApp(App);
app.use(VueQueryPlugin);
app.mount("#app");
