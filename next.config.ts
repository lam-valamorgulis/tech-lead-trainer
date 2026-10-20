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
  // The dev badge sits in the bottom-left corner and covers links there in seam C tests.
  devIndicators: false,
  // The service worker must never come from a cache, so a fix reaches the phone at once.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
