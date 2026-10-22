import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser tests must not take over the user's running development server.
  distDir: process.env.IMPACTRELAY_E2E === "1" ? ".next-e2e" : ".next",
  typescript: process.env.IMPACTRELAY_E2E === "1" ? { tsconfigPath: "tsconfig.e2e.json" } : undefined,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
