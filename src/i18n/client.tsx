'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_PARAM, type Locale } from './config';
import { translate, type Dict } from './dict';

type Ctx = { locale: Locale; dict: Dict };

const I18nContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, dict: {} });

/** Словник приїжджає з серверного layout — у клієнтський бандл потрапляє лише активна мова. */
export function I18nProvider({ locale, dict, children }: Ctx & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export function useT() {
  const { dict } = useContext(I18nContext);
  return useMemo(
    () => (key: string, vars?: Record<string, string | number>) => translate(dict, key, vars),
    [dict]
  );
}

/**
 * Додає мову до адреси. Потрібно там, де сторінка відкривається в iframe
 * (вправа в лекції, вправа в Notion) або звідти ходить у API: куки сайту
 * у сторонньому фреймі недоступні, тож мова їде параметром.
 */
export function withLang(url: string, locale: Locale): string {
  if (/^https?:\/\//.test(url)) return url;
  if (new RegExp(`[?&]${LOCALE_PARAM}=`).test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${LOCALE_PARAM}=${locale}`;
}
