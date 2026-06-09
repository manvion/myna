/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.pexels.com" },
      { protocol: "https", hostname: "**.pixabay.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflare.com" },
    ],
  },
  // Allow API calls to Render from Vercel
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_WEB_URL || "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
