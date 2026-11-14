import 'server-only';
import { cookies, headers } from 'next/headers';
import { isLocale, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from './config';
import { getDict, translate, type Dict } from './dict';

export type { Locale };

/**
 * Мова сторінки. Порядок: ?lang= → кука → типова.
 * Обидва джерела звела в заголовок middleware, тому мову однаково видно і в page,
 * і в layout (layout не отримує searchParams), і всередині iframe з ембедом.
 * Профіль учня синхронізується при зміні мови — щоб вибір їхав за людиною
 * на інший пристрій, але не коштував запиту до бази на кожній сторінці.
 */
export function getLocale(searchParams?: { lang?: string | string[] }): Locale {
  const fromParam = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  if (isLocale(fromParam)) return fromParam;
  try {
    const fromHeader = headers().get(LOCALE_HEADER);
    if (isLocale(fromHeader)) return fromHeader;
  } catch {
    // статичний рендер без запиту — лишається кука/типова
  }
  try {
    const c = cookies().get(LOCALE_COOKIE)?.value;
    if (isLocale(c)) return c;
  } catch {
    /* те саме */
  }
  return DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dict {
  return getDict(locale);
}

/** t() для серверних компонентів. */
export function getT(locale?: Locale) {
  const l = locale ?? getLocale();
  const dict = getDict(l);
  return (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars);
}

/**
 * t() для серверного коду — компонентів, route handlers, бібліотек.
 * Мову бере із запиту сама, тому не треба нічого прокидати аргументами.
 * У клієнтських компонентах натомість useT() з '@/i18n/client'.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(getDict(getLocale()), key, vars);
}
