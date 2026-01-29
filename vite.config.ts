import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://192.168.112.253:8000',
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
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
