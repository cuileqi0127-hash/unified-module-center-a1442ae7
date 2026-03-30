/** 与原先 vite.config 代理目标一致；本地可在 .env.local 中设置 ORAN_TARGET */
const oranTarget =
  process.env.ORAN_TARGET ||
  process.env.VITE_ORAN_TARGET ||
  "http://119.13.125.102:29273";

/** @type {import('next').NextConfig} */
const radixUiPackages = [
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
];

/** lodash（recharts 等依赖）在服务端 vendor chunk 路径偶发缺失；勿加入 recharts，会与 transpilePackages 冲突 */
const serverExtraExternals = ["lodash"];

const nextConfig = {
  reactStrictMode: true,
  /**
   * 避免服务端把 @radix-ui / lodash 等打成 vendor-chunks 后出现
   * Cannot find module './vendor-chunks/@radix-ui.js' | './vendor-chunks/lodash.js'
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages
   */
  experimental: {
    serverComponentsExternalPackages: [...radixUiPackages, ...serverExtraExternals],
  },
  async rewrites() {
    return [
      {
        source: "/api/tu-zi/:path*",
        destination: "https://api.tu-zi.com/:path*",
      },
      {
        source: "/api/process/:path*",
        destination: "http://183.87.33.181:8001/api/process/:path*",
      },
      {
        source: "/api/video-to-prompt/:path*",
        destination: "http://183.87.33.181:8001/:path*",
      },
      {
        source: "/api/proxy/:path*",
        destination: `${oranTarget}/api/proxy/:path*`,
      },
      {
        source: "/api/tools/download/:path*",
        destination: `${oranTarget}/tools/download/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${oranTarget}/:path*`,
      },
      {
        source: "/aigc/:path*",
        destination: "http://94.74.98.20:8001/aigc/:path*",
      },
      {
        source: "/vod/:path*",
        destination: "http://94.74.98.20:8000/vod/:path*",
      },
      {
        source: "/common/:path*",
        destination: `${oranTarget}/common/:path*`,
      },
    ];
  },
};

export default nextConfig;
