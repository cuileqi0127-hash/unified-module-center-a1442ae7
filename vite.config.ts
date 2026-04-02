import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const oranTarget =
    env.VITE_ORAN_TARGET ||
    env.ORAN_TARGET ||
    "http://119.13.125.102:29273";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 8081,
      proxy: {
        "/api/tu-zi": {
          target: "https://api.tu-zi.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/tu-zi/, ""),
        },
        "/api/process": {
          target: "http://183.87.33.181:8001",
          changeOrigin: true,
        },
        "/api/video-to-prompt": {
          target: "http://183.87.33.181:8001",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/video-to-prompt/, ""),
        },
        "/api/proxy": {
          target: oranTarget,
          changeOrigin: true,
        },
        "/api/tools/download": {
          target: oranTarget,
          changeOrigin: true,
          rewrite: (p) =>
            p.replace(/^\/api\/tools\/download/, "/tools/download"),
        },
        "/api": {
          target: oranTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, "") || "/",
        },
        "/aigc": {
          target: "http://94.74.98.20:8001",
          changeOrigin: true,
        },
        "/vod": {
          target: "http://94.74.98.20:8000",
          changeOrigin: true,
        },
        "/common": {
          target: oranTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
