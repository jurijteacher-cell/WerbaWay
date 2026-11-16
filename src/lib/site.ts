/**
 * Як сайт представляється пошуковикам (Google, соцмережі).
 * Werba Way — освітня онлайн-платформа. «Мовною школою» не називати (Юра, 16.11.2026).
 */
export const SITE_URL = 'https://www.werbaway.com';

/** Ключ словника i18n — переклади в src/i18n/dict/*.json. */
export const SITE_DESCRIPTION_KEY =
  'Werba Way — освітня онлайн-платформа для вивчення польської мови: інтерактивні уроки від A0 до B2, вправи, словникові картки та підготовка до іспиту B1.';

/** Структуровані дані для головної: так Google бачить назву сайту й логотип і не плутає бренд. */
export function siteJsonLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Werba Way',
        alternateName: ['WerbaWay', 'werbaway.com'],
        url: `${SITE_URL}/`,
        description,
        inLanguage: ['uk', 'ru', 'pl', 'en'],
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Werba Way',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand/werba-logo.jpg`,
        description,
      },
    ],
  };
}
