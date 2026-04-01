import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests from preview URLs (Caddy reverse proxy)
  allowedDevOrigins: [
    "preview-chat-583261ee-767a-457c-9312-1adb3410fffc.space.z.ai",
  ],
};

export default nextConfig;
