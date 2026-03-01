/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon', permanent: false }];
  },
};

export default nextConfig;
