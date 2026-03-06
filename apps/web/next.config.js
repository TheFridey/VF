/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost', 's3.amazonaws.com', 'veteranfinder-uploads.s3.amazonaws.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
