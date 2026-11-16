import type { Metadata, Viewport } from 'next';
import { Onest, Literata, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ReportBug } from '@/components/ReportBug';
import { TopNav } from '@/components/TopNav';
import { I18nProvider } from '@/i18n/client';
import { getDictionary, getLocale, getT } from '@/i18n/server';
import { HTML_LANG } from '@/i18n/config';
import { SITE_DESCRIPTION_KEY, SITE_URL } from '@/lib/site';

// Ті самі шрифти, що у вправах: Onest — інтерфейс, Literata — польський текст. Обидва мають латиницю з діакритикою й кирилицю.
const onest = Onest({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-onest',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
  // текст лекцій: 8 файлів (2 накреслення × 4 набори) не тягнемо наперед на кожну сторінку —
  // браузер візьме потрібні, коли на сторінці з'явиться польський текст
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getT(getLocale());
  const title = t('Werba Way — польська мова онлайн');
  const description = t(SITE_DESCRIPTION_KEY);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: 'Werba Way',
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Werba Way',
      title,
      description,
      url: '/',
      images: [{ url: '/brand/werba-logo-full.jpg', width: 1024, height: 1024, alt: 'Werba Way' }],
    },
    twitter: { card: 'summary', title, description, images: ['/brand/werba-logo-full.jpg'] },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // нижня панель враховує «чубчик» і смугу жестів
  themeColor: '#ffffff',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const dict = getDictionary(locale);
  return (
    <html lang={HTML_LANG[locale]} className={`${onest.variable} ${literata.variable} ${plexMono.variable}`}>
      <head>
        <link rel="preload" as="image" href="/brand/werba-mark-128.webp" />
      </head>
      <body className="font-sans">
        <I18nProvider locale={locale} dict={dict}>
          <TopNav />
          {children}
          <ReportBug />
        </I18nProvider>
      </body>
    </html>
  );
}
