import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";

import App from "./App.vue";
import "./wallet-config";
import "./style.css";

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
