/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Лекції, вправи й карти перекладів читаються з диска (fs) — без цього Vercel
    // не покладе ці файли у серверну функцію
    outputFileTracingIncludes: {
      '/learn': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/api/learn/share': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/s/[token]': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/s/[token]/hw': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/api/search': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/teacher-pages/**/*', './src/content/queue-published/**/*'],
      '/teacher/students/[id]': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/queue-published/**/*'],
      '/teacher/lesson/[slug]': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/teacher-pages/**/*'],
      '/api/learn/teacher-notes': ['./src/content/teacher-pages/**/*'],
      '/words': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/queue-published/**/*'],
      '/words/play': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/queue-published/**/*'],
      '/dashboard': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/queue-published/**/*'],
      '/teacher/class/[studentId]': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/learn/[slug]': ['./src/content/pages/**/*', './src/content/i18n/**/*', './src/content/teacher-pages/**/*'],
      '/learn/[slug]/hw': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/api/learn/steps': ['./src/content/pages/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/comm-tasks': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/exam': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/grammar': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/grammar-board': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/hw': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/mock-exam': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/notes': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/pictures': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/placement': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/slides': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/embed/[lessonId]/vocab': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/api/mock-exam/[lessonId]': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/api/mock-exam/[lessonId]/finish': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/api/placement/[lessonId]': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/api/placement/[lessonId]/finish': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
      '/api/placement/[lessonId]/level': ['./src/content/queue-published/**/*', './src/content/i18n/**/*'],
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
