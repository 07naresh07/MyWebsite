// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Read both names; use either one in .env(.local)
  const env = loadEnv(mode, process.cwd(), "");
  const backend = (env.VITE_BACKEND_URL || env.VITE_API_URL || "https://localhost:7202")
    .replace(/\/+$/, ""); // no trailing slash

  return {
    plugins: [react()],
    optimizeDeps: { include: ["lucide-react"] },
    resolve: { dedupe: ["react", "react-dom"] },

    server: {
      cors: true,
      proxy: {
        // proxy EVERYTHING under /api to your backend
        "^/api/.*": {
          target: backend,
          changeOrigin: true,
          secure: false, // allow self-signed dev certs (ASP.NET dev-certs)
          // rewrite: (p) => p, // keep as-is; uncomment if you ever need it
        },
      },
    },
  };
});
