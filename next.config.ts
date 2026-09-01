import type { NextConfig } from "next";

// One stable id per deployed build. Prefer the git SHA (deterministic across
// containers / rebuilds of the same commit); fall back to build time so every
// build still gets a unique id. Exposed to the client as NEXT_PUBLIC_BUILD_ID so
// the running app can tell when a newer build has been deployed (see
// app/api/version/route.ts and components/admin/AppUpdateNotifier.tsx).
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.SOURCE_COMMIT?.slice(0, 8) ??
  String(Date.now());

const nextConfig: NextConfig = {
  generateBuildId: () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icyahmikemuyyenlbqwx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // /order was renamed to /inquire (the public self-service form was always
      // genuinely an inquiry, not an order) — keep old links/bookmarks working.
      {
        source: "/order/:path*",
        destination: "/inquire/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
