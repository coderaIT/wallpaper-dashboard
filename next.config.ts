import type { NextConfig } from "next";

const target = (process.env.API_PROXY_TARGET ?? "http://localhost:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: {
    // Default proxy body cap is 10MB, which rejects a normal wallpaper batch.
    proxyClientMaxBodySize: "32mb",
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
