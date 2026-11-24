import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/2025/spooky", destination: "/" },
      { source: "/2025/spooky/api/stats", destination: "/api/stats" },
      { source: "/2025/spooky/api/submit", destination: "/api/submit" },
    ];
  },
};

export default nextConfig;
