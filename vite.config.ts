import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Removed Replit runtime error overlay plugin because it was throwing
// 'Failed to execute removeChild' errors when dismissing the modal.
// Vite's own overlay is already disabled via server.hmr.overlay = false.
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    hmr: {
      overlay: false,  // 🔥 This disables the annoying Vite overlay completely
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
