import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Playwright opens the dev server on 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
