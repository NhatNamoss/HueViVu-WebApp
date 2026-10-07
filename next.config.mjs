/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
