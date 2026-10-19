import type { NextConfig } from "next";

// The fixture town is for seam C only. A production build with it would teach nothing.
if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_CONTENT_SET === "fixture") {
  throw new Error("NEXT_PUBLIC_CONTENT_SET=fixture is not allowed in a production build.");
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Playwright opens the dev server on 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
