import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Публічна в сайту лише головна (вхід), реєстрація й правові сторінки; решта — під акаунтом.
 * Вправи (/embed, /slides) не забороняємо тут, а ставимо noindex заголовком (next.config.js):
 * заборона в robots.txt не прибирає адресу з видачі, а лише ховає від Google сам noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/diag'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
