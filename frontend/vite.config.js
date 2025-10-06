// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Read env at build time (Vite envs are compile-time)
  const env = loadEnv(mode, process.cwd(), "");
  const raw = (env.VITE_BACKEND_URL || env.VITE_API_URL || "").trim();
  const backend = raw.replace(/\/+$/, ""); // strip trailing slash

  // In production, force a real backend base URL to avoid /api 404 on the frontend host
  if (mode === "production" && !backend) {
    throw new Error(
      "Missing VITE_BACKEND_URL (or VITE_API_URL). " +
      "Set it to your FastAPI origin, e.g. https://api.example.com"
    );
  }

  // In dev, fall back to your local backend (adjust as you prefer)
  const devFallback = "https://localhost:7202";
  const proxyTarget = backend || devFallback;

  return {
    plugins: [react()],
    optimizeDeps: { include: ["lucide-react"] },
    resolve: { dedupe: ["react", "react-dom"] },

    server: {
      cors: true,
      proxy: {
        // Forward all /api requests to the backend in dev
        "^/api/.*": {
          target: proxyTarget,
          changeOrigin: true,
          // allow self-signed local certs; fine for dev
          secure: false,
        },
      },
    },

    // Make the chosen backend available to your app code (optional safety net)
    define: {
      __API_BASE__: JSON.stringify(backend || ""),
    },
  };
});
