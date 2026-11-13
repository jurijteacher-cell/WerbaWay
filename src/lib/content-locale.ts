import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { applyJson } from '@/i18n/segment.mjs';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';

/**
 * Вправи мовою пояснень. Самі файли вправ одні на всі мови — польський матеріал
 * і польські інструкції не дублюються. Поряд лежить лише карта перекладів
 * { ключ: "переклад" }, ключ рахується з тексту джерела.
 *
 * Чого в карті немає — лишається мовою джерела: вправа ніколи не ламається.
 */
const EXERCISES = path.join(process.cwd(), 'src/content/queue-published');
const I18N = path.join(process.cwd(), 'src/content/i18n/exercises');

const cache = new Map<string, Record<string, string> | null>();

function translations(fileName: string, locale: Locale): Record<string, string> | null {
  if (locale === DEFAULT_LOCALE) return null;
  const base = path.basename(fileName).replace(/\.json$/, '');
  const cacheKey = `${base}:${locale}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  const full = path.join(I18N, `${base}.${locale}.json`);
  let map: Record<string, string> | null = null;
  if (existsSync(full)) {
    try {
      map = JSON.parse(readFileSync(full, 'utf8')) as Record<string, string>;
    } catch {
      map = null;
    }
  }
  cache.set(cacheKey, map);
  return map;
}

/** Підставляє переклади в уже прочитаний JSON вправи. */
export function localizeExercise<T>(fileName: string, raw: T, locale: Locale = DEFAULT_LOCALE): T {
  const map = translations(fileName, locale);
  return map ? (applyJson(raw, map) as T) : raw;
}

/** Читає файл вправи з src/content/queue-published уже потрібною мовою. */
export function readExerciseJson<T>(fileName: string, locale: Locale = DEFAULT_LOCALE): T | null {
  const full = path.join(EXERCISES, path.basename(fileName));
  if (!existsSync(full)) return null;
  return localizeExercise(fileName, JSON.parse(readFileSync(full, 'utf8')) as T, locale);
}
