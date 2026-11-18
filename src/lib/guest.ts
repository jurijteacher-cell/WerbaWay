/**
 * Гість за публічним посиланням /s/<token>: акаунта немає, тому «особистість» — кука ww_vid
 * (uuid на рік, видає middleware). Під нею живуть guest_visitors / guest_views,
 * відповіді у вправах і канал Realtime guest:<vid> (0016_guests.sql).
 */

export const VID_COOKIE = 'ww_vid';
export const VID_MAX_AGE = 60 * 60 * 24 * 365; // рік
const VID_STORE = 'ww.vid';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Автопідпис гостя у викладача: «Гість 7» */
export const guestLabel = (num: number | null | undefined) => (num ? `Гість ${num}` : 'Гість');

/** vid із куки (клієнт) */
export function readVid(): string | null {
  if (typeof document === 'undefined') return null;
  const m = new RegExp(`(?:^|;\\s*)${VID_COOKIE}=([^;]+)`).exec(document.cookie);
  const v = m?.[1] ? decodeURIComponent(m[1]) : null;
  return v && UUID_RE.test(v) ? v : null;
}

/**
 * vid для цього браузера: кука, а якщо її почистили — відновлюємо з localStorage,
 * щоб той самий браузер лишився тим самим гостем (і не з'явився в списку другим разом).
 */
export function ensureVid(): string | null {
  const fromCookie = readVid();
  if (fromCookie) {
    try {
      localStorage.setItem(VID_STORE, fromCookie);
    } catch {
      /* приватний режим — не критично */
    }
    return fromCookie;
  }
  try {
    const saved = localStorage.getItem(VID_STORE);
    if (saved && UUID_RE.test(saved)) {
      const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; secure' : '';
      document.cookie = `${VID_COOKIE}=${saved}; path=/; max-age=${VID_MAX_AGE}; samesite=lax${secure}`;
      return saved;
    }
  } catch {
    /* localStorage недоступний */
  }
  return null;
}

/** кука більше не потрібна: гість переїхав на акаунт */
export function forgetVid() {
  try {
    localStorage.removeItem(VID_STORE);
  } catch {
    /* не критично */
  }
  if (typeof document !== 'undefined') document.cookie = `${VID_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
