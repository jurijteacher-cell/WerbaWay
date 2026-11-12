import type { Metadata, Viewport } from 'next';
import { Onest, Literata, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { TopNav } from '@/components/TopNav';

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

export const metadata: Metadata = {
  title: 'Werba Way',
  description: 'Польська мова для українців — уроки та вправи',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // нижня панель враховує «чубчик» і смугу жестів
  themeColor: '#fbf9f4',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${onest.variable} ${literata.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
