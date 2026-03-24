import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '/home/snipe/snapcover-app',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
