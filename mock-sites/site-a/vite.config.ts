import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "../src"),
  envDir: __dirname,
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 7001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist-a"),
    emptyOutDir: true,
  },
});
