/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // SECURITY/STABILITY: `typescript.ignoreBuildErrors` was masking 70 type
  // errors on main (the same mechanism that let the dashboard routing
  // regression ship). As of 2026-09-24 `npx tsc --noEmit` is clean on main,
  // so the gate stays ON. Do not re-enable without a written exception.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
       {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8080/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
