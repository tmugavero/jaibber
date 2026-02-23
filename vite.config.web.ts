import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Web-only Vite config — builds a standard SPA deployable to Vercel.
 * Externalizes @tauri-apps/* packages since they're behind `isTauri` runtime
 * guards in platform.ts and never execute in the browser.
 *
 * Usage: vite build --config vite.config.web.ts
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      external: (id) => id.startsWith("@tauri-apps/"),
    },
  },
});
