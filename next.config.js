/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'graph.facebook.com', 'platform-lookaside.fbsbx.com'],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  }
}

module.exports = nextConfig
