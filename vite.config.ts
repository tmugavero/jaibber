import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// On Linux, Tauri's WebView runs as a separate process and needs Vite to bind
// to 0.0.0.0. On Windows we force 127.0.0.1 to avoid IPv6 TIME_WAIT grief.
// @ts-expect-error process is a nodejs global
const isWindows = process.platform === "win32";
const viteHost = host || (isWindows ? "127.0.0.1" : "0.0.0.0");

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5174,
    strictPort: true,
    host: viteHost,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5175,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
