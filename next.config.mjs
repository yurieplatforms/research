/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: "loose",
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  transpilePackages: ["streamdown"],
};

export default nextConfig;

