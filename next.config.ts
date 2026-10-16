import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@homebridge/node-pty-prebuilt-multiarch"],
};

export default nextConfig;
