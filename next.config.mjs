/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Сторінки-лекції читаються з диска (fs) — без цього Vercel не покладе .md у серверну функцію
    outputFileTracingIncludes: {
      '/learn': ['./src/content/pages/**/*'],
      '/dashboard': ['./src/content/pages/**/*'],
      '/teacher/class/[studentId]': ['./src/content/pages/**/*'],
      '/learn/[slug]': ['./src/content/pages/**/*'],
      '/learn/[slug]/hw': ['./src/content/pages/**/*'],
      '/api/learn/steps': ['./src/content/pages/**/*'],
    },
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          // Allow Notion (and others) to iframe exercise embeds
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
      {
        // Mock exam API is public (no auth): allow calls from sandboxed iframes (Origin: null)
        source: '/api/mock-exam/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};
export default nextConfig;
