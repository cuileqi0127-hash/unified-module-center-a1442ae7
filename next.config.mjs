/** 与原先 vite.config 代理目标一致；本地可在 .env.local 中设置 ORAN_TARGET */
const oranTarget =
  process.env.ORAN_TARGET ||
  process.env.VITE_ORAN_TARGET ||
  "http://119.13.125.102:29273";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
