import { headers } from 'next/headers';
import { LOCALE_EXPLICIT_HEADER, type Locale } from './config';

/**
 * Чи підставляти українську карту в лекцію, написану російською (`.uk.json`).
 *
 * Українська — мова за замовчуванням, тому її отримує й той, хто мови не обирав:
 * наприклад, російськомовний учень, у якого вправа відкрита в iframe Notion без ?lang=.
 * Йому лекція має лишитися російською, як написана. Тож `.uk.json` діє, лише коли
 * UA обрано явно (перемикач, кука, ?lang=uk). Поза запитом (скрипти, білд) — ні.
 */
export function applyUkMap(locale: Locale): boolean {
  if (locale !== 'uk') return true;
  try {
    return headers().get(LOCALE_EXPLICIT_HEADER) === '1';
  } catch {
    return false;
  }
}
