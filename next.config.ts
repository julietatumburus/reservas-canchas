import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir requests de dev desde los subdominios de cada club (multitenancy).
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
};

export default nextConfig;
