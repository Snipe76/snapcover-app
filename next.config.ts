import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // web-push and resend are CommonJS/Node modules — keep them server-side only
  serverExternalPackages: ['web-push', 'resend'],
};

export default nextConfig;
