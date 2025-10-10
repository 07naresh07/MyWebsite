// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Only load VITE_* variables into client build
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Prefer VITE_BACKEND_URL, fallback to VITE_API_URL
  const raw = (env.VITE_BACKEND_URL || env.VITE_API_URL || "").trim();
  const backend = raw.replace(/\/+$/, ""); // strip trailing slashes

  // In production, force an explicit backend URL to avoid calling the frontend host
  if (mode === "production" && !backend) {
    throw new Error(
      "Missing VITE_BACKEND_URL (or VITE_API_URL). " +
      "Set it to your FastAPI origin, e.g. https://yxsz99fuup.ap-south-1.awsapprunner.com"
    );
  }

  // Local dev fallback (adjust if you run on a different port)
  const devFallback = "http://localhost:8000";
  const proxyTarget = backend || devFallback;

  // Helpful visibility in logs
  console.log(`[vite] mode=${mode} backend=${proxyTarget || "(none)"}`);

  return {
    plugins: [react()],
    optimizeDeps: { include: ["lucide-react"] },
    resolve: { dedupe: ["react", "react-dom"] },

    server: {
      // vite handles CORS for proxied requests; leave true if you like, but not required
      cors: true,
      proxy: {
        // Use a path prefix (not a regex) so /api/* proxies to your backend in dev
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false, // allow self-signed certs if you ever use https locally
        },
      },
    },

    // Optional: expose the resolved backend to app code as a safety net
    define: {
      __API_BASE__: JSON.stringify(backend || ""),
    },
  };
});
