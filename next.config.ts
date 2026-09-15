import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev indicator sits over the bottom nav's first item, which
  // blocks taps there in development and in end-to-end runs.
  devIndicators: false,
  // The end-to-end suite runs its own local-only server alongside `next dev`,
  // and Next allows one dev server per build folder.
  ...(process.env.ARISE_DIST_DIR ? { distDir: process.env.ARISE_DIST_DIR } : {}),
};

export default nextConfig;
