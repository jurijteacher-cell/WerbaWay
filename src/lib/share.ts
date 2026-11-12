import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Публічне посилання на лекцію: /s/<slug>.<підпис>.
 * Підпис — HMAC від slug серверним секретом, тож посилання не підробити й не перебрати.
 * Без секрету на сервері посилання вимкнені (жодного «запасного» ключа в коді).
 */
const SECRET = process.env.SHARE_SECRET || process.env.PLACEMENT_SESSION_SECRET || process.env.NOTION_API_KEY || '';

const sig = (slug: string) => createHmac('sha256', SECRET).update(`lecture:${slug}`).digest('base64url').slice(0, 22);

export const shareEnabled = () => SECRET.length >= 16;

export function shareToken(slug: string): string | null {
  return shareEnabled() ? `${slug}.${sig(slug)}` : null;
}

export function verifyShare(token: string): string | null {
  if (!shareEnabled()) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const slug = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(sig(slug));
  return a.length === b.length && timingSafeEqual(a, b) ? slug : null;
}
