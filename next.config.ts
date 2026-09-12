import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev indicator sits over the bottom nav's first item, which
  // blocks taps there in development and in end-to-end runs.
  devIndicators: false,
};

export default nextConfig;
