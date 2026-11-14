/**
 * Мови сайту. Російська — без прапора (і взагалі прапорів немає: мітки текстові,
 * бо прапор ≠ мова, а для російської це ще й політично хибно).
 */
export const LOCALES = ['uk', 'ru', 'pl', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uk';

/** Підпис у перемикачі (коротко) і повна назва — обидві мовою самої локалі. */
export const LOCALE_LABEL: Record<Locale, { short: string; full: string }> = {
  uk: { short: 'UA', full: 'Українська' },
  ru: { short: 'RU', full: 'Русский' },
  pl: { short: 'PL', full: 'Polski' },
  en: { short: 'EN', full: 'English' },
};

/** Значення для <html lang>. */
export const HTML_LANG: Record<Locale, string> = { uk: 'uk', ru: 'ru', pl: 'pl', en: 'en' };

export const LOCALE_COOKIE = 'ww_lang';
/** Ембеди відкриваються в iframe (Notion) — куки туди не доходять, мова йде параметром. */
export const LOCALE_PARAM = 'lang';
/** Middleware зводить ?lang= і куку в цей заголовок, щоб мову бачив і layout. */
export const LOCALE_HEADER = 'x-ww-lang';

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

export function asLocale(x: unknown): Locale {
  return isLocale(x) ? x : DEFAULT_LOCALE;
}
