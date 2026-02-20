/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide Next.js dev indicators ("watermark")
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },

  // Trailing slash issue ni hal qilish
  skipTrailingSlashRedirect: true,

  // Rasmlarni optimallashtirish
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/media/**',
      },
    ],
  },

  // API va media so'rovlarni Django backendga proxy qilish
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/media/:path*',
        destination: 'http://127.0.0.1:8000/media/:path*',
      },
      {
        source: '/django-admin/:path*',
        destination: 'http://127.0.0.1:8000/django-admin/:path*',
      },
    ];
  },

  // Xavfsizlik headerlari
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
