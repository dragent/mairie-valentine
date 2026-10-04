import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by the production Docker image, which runs `node server.js`.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/avatars/**" },
    ],
  },
};

export default nextConfig;
