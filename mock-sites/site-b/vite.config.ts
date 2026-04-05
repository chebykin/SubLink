import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "../src"),
  envDir: __dirname,
  plugins: [vue()],
  resolve: {
    alias: {
      // Browser shim for Node's `module`: @unlink-xyz/sdk calls
      // createRequire() to lazy-load @zk-kit/eddsa-poseidon/blake-2b.
      module: resolve(__dirname, "../src/shims/module.ts"),
      // @zk-kit/eddsa-poseidon's package.json advertises
      //   ./blake-2b -> ./dist/esm/...
      // but the actual files live in ./dist/lib.esm/... — alias to the
      // real file bypassing the broken exports field.
      "@zk-kit/eddsa-poseidon/blake-2b": resolve(
        __dirname,
        "../node_modules/@zk-kit/eddsa-poseidon/dist/lib.esm/eddsa-poseidon-blake-2b.js",
      ),
    },
  },
  optimizeDeps: {
    include: ["@unlink-xyz/sdk"],
  },
  server: {
    host: "127.0.0.1",
    port: 7002,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist-b"),
    emptyOutDir: true,
  },
});
