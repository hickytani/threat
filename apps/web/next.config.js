/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // All pages are dynamic (live security data — no static pre-rendering)
  // This prevents the V8 OOM crash during static page generation on Windows
  experimental: {
    workerThreads: false,
  },
  // Ensure no static optimization is attempted at build time
  // generateStaticParams is disabled app-router wide via force-dynamic on each page
};

module.exports = nextConfig;
