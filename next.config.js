/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lbgqkqpiigfknfisaqfo.supabase.co'
    ],
  },
  // distDir: 'public'
}

module.exports = nextConfig