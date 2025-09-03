/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    // Docker deployment: always proxy to backend
    if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'docker') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://backend:8000/api/:path*',  // Use internal Docker network
        },
        {
          source: '/ws/:path*',
          destination: 'http://backend:8000/ws/:path*',   // Use internal Docker network
        },
      ]
    }
    
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