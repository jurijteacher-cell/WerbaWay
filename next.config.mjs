/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          // Allow Notion (and others) to iframe exercise embeds
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};
export default nextConfig;
