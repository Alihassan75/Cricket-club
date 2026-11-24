/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Only bundle the lucide icons actually used instead of the whole icon set.
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      { source: "/demo/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }] },
      { source: "/uploads/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ];
  },
};
module.exports = nextConfig;
