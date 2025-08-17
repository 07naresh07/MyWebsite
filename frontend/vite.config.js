// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Make sure Vite pre-bundles lucide-react so it can be resolved
  optimizeDeps: {
    include: ["lucide-react"],
  },
  // Avoid multiple React copies if you have nested workspaces
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:5202", changeOrigin: true, secure: false }
    }
  }
});
