import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone, which the Docker runtime stage copies instead of
  // shipping the whole node_modules tree.
  output: 'standalone',
};

export default nextConfig;
