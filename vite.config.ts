import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // tu-zi API 代理（需要放在 /api 之前，因为更具体）
      '/api/tu-zi': {
        target: 'https://api.tu-zi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tu-zi/, ''),
      },
      '/api': {
        target: 'http://94.74.101.163:28080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 文生视频接口代理（端口 8001）
      '/aigc': {
        target: 'http://94.74.98.20:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aigc/, '/aigc'),
      },
      // 视频上传接口代理（端口 8000）
      '/vod': {
        target: 'http://94.74.98.20:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vod/, '/vod'),
      },
      "/api/video-to-prompt": {
        target: 'http://183.87.33.181:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/video-to-prompt/, ''),
      },
      "/api/process": {
        target: 'http://183.87.33.181:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/process/, ''),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
