/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Next.js Image Optimization needs a server; disable for static export
  },
};
export default nextConfig;
