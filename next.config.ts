import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's an unrelated lockfile in the home directory; pin the workspace root here so
  // Next doesn't guess wrong about where the project lives.
  turbopack: { root: __dirname },
};

export default nextConfig;
