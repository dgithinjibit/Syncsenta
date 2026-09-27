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
    // `backend/syncsenta-backend` (Rust, `/api/v1/mvp/*`) is not deployed
    // anywhere, so this destination has to stay reachable on a laptop for
    // local development while a real deployment needs one environment
    // variable, not a code change. Leaving the literal `localhost:8080` in
    // place is what made every `/api/v1` call fail silently on
    // sentastudio.vercel.app: the tutor and the teacher live view both looked
    // like loading states rather than a missing backend.
    //
    // Note this cannot carry WebSockets - Next rewrites do not proxy them -
    // which is why `NEXT_PUBLIC_BACKEND_WS_URL` exists separately.
    // `SYNCSENTA_BACKEND_URL` is deliberately not reused here: `lib/omega-claw-api.ts`
    // reads that one as "base URL including /api/v1", so accepting the same
    // value with a different meaning would double the prefix.
    const mvpBackend = (process.env.MVP_BACKEND_URL || 'http://localhost:8080').replace(
      /\/$/,
      ''
    );

    return [
      {
        source: '/api/v1/:path*',
        destination: `${mvpBackend}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
