/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lbgqkqpiigfknfisaqfo.supabase.co'
    ],
  },
  // distDir: 'public'
}

module.exports = nextConfig