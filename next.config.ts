import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
