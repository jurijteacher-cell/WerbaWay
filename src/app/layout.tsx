import type { Metadata, Viewport } from 'next';
import { Onest, Literata, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ReportBug } from '@/components/ReportBug';
import { TopNav } from '@/components/TopNav';
import { I18nProvider } from '@/i18n/client';
import { getDictionary, getLocale, getT } from '@/i18n/server';
import { HTML_LANG } from '@/i18n/config';

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
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getT(getLocale());
  return {
    title: 'Werba Way',
    description: t('Польська мова — уроки та вправи'),
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
