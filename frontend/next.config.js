/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    // Local development: proxy to local backend
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
        {
          source: '/ws/:path*',
          destination: 'http://localhost:8000/ws/:path*',
        },
      ]
    }
    
    // Vercel deployment: proxy to external backend (Railway)
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      // Normalize backend URL to handle trailing slashes
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
      
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: '/ws/:path*',
          destination: `${backendUrl}/ws/:path*`,
        },
      ]
    }
    
    return []
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    };
    return config;
  },
}

module.exports = nextConfig