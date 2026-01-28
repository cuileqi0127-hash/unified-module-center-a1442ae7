import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const defaultUpstreamUrl = "http://183.87.33.181:8001/api/process/upload";
  const upstreamUrl =
    env.VIDEO_TO_PROMPT_API_URL ??
    env.VITE_VIDEO_TO_PROMPT_API_URL ??
    defaultUpstreamUrl;
  const upstreamApiKey =
    env.VIDEO_TO_PROMPT_API_KEY ?? env.VITE_VIDEO_TO_PROMPT_API_KEY;

  let upstreamOrigin = "http://183.87.33.181:8001";
  let upstreamPath = "/api/process/upload";
  try {
    const url = new URL(upstreamUrl);
    upstreamOrigin = `${url.protocol}//${url.host}`;
    upstreamPath = url.pathname;
  } catch {
    // If upstreamUrl is not absolute, fall back to defaults above.
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api/video-to-prompt": {
          target: upstreamOrigin,
          changeOrigin: true,
          secure: false,
          rewrite: (reqPath) =>
            reqPath.replace(/^\/api\/video-to-prompt/, upstreamPath),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (upstreamApiKey) {
                proxyReq.setHeader("X-API-KEY", upstreamApiKey);
              }
            });
          },
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
