import type { Locale } from './config';
import uk from './dict/uk.json';
import ru from './dict/ru.json';
import pl from './dict/pl.json';
import en from './dict/en.json';

export type Dict = Record<string, string>;

const DICTS: Record<Locale, Dict> = {
  uk: uk as Dict,
  ru: ru as Dict,
  pl: pl as Dict,
  en: en as Dict,
};

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? DICTS.uk;
}

/**
 * Ключ — сам український рядок. Немає перекладу → показуємо ключ:
 * інтерфейс ніколи не ламається, максимум лишається українською.
 * Підстановки: t('Залишилось {n} хв', { n: 5 }).
 */
export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  const base = dict[key] ?? key;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
