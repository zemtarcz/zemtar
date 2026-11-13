import type { NextConfig } from "next";

const immutableAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  /** Až 4×2 MB fotek + textová pole poptávky. */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      { source: "/seq/:path*", headers: immutableAssetHeaders },
      { source: "/textures/:path*", headers: immutableAssetHeaders },
      { source: "/hero/:path*", headers: immutableAssetHeaders },
      { source: "/truck/:path*", headers: immutableAssetHeaders },
      { source: "/technika/:path*", headers: immutableAssetHeaders },
    ];
  },
};

export default nextConfig;
