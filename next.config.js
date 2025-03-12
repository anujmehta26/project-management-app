/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure webpack to properly handle CSS and extensions
  webpack: (config) => {
    // Add proper extensions
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', ...config.resolve.extensions];
    return config;
  },
  // Ensure CSS is properly processed
  // External packages configuration (moved from experimental)
  serverExternalPackages: [],
  // Disable image optimization if causing issues
  images: {
    disableStaticImages: false,
  }
}

module.exports = nextConfig