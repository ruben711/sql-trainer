/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // sql.js needs fs/path falsy in the browser
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
  // Uncomment voor GitHub Pages static export:
  // output: 'export',
  // images: { unoptimized: true },
};
module.exports = nextConfig;
