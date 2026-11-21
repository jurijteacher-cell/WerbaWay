import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_EXPLICIT_HEADER, LOCALE_HEADER, LOCALE_PARAM, LOCALES } from '@/i18n/config';
import { VID_COOKIE, VID_MAX_AGE } from '@/lib/guest';

/**
 * Мова запиту: ?lang= (ембед у iframe куки не бачить) → кука → типова.
 * Кладемо її в заголовок, бо layout у Next не отримує searchParams, а мову
 * треба знати ще до рендера (<html lang>, словник інтерфейсу, глоси в лекції).
 */
function localeHeaders(request: NextRequest) {
  const param = request.nextUrl.searchParams.get(LOCALE_PARAM);
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const chosen = [param, cookie].find((x) => x && (LOCALES as readonly string[]).includes(x));
  const locale = chosen ?? DEFAULT_LOCALE;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set(LOCALE_EXPLICIT_HEADER, chosen ? '1' : '0');
  return headers;
}

const PROTECTED_PREFIXES = ['/lessons', '/lectures', '/teacher', '/dashboard', '/learn', '/words'];

/** Public surfaces opened from Notion iframes — no auth, no Supabase round-trip. */
const PUBLIC_PREFIXES = ['/embed', '/slides', '/brand', '/api/embed'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const headers = localeHeaders(request);

  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next({ request: { headers } });
  }

  let response = NextResponse.next({ request: { headers } });

  // Next префетчить кожен видимий <Link>, а getUser() — це запит до Supabase Auth на кожен такий префетч.
  // Для залогіненого (є кука сесії) префетч не перевіряємо: справжній перехід піде повним запитом
  // через цей же middleware, а сторінки з приватними даними перевіряють користувача самі.
  const isPrefetch = request.headers.get('next-router-prefetch') === '1' || request.headers.get('purpose') === 'prefetch';
  if (isPrefetch && path !== '/' && request.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name))) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Preview deployments may have no Supabase env: don't crash every page, just treat as logged out.
  if (!supabaseUrl || !supabaseKey) {
    if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !/^\/lessons\/pl-/.test(path)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Content-queue notebook lessons are public (LMS + Playwright)
  const isPublicQueueLesson = /^\/lessons\/pl-/.test(path);

  // Головна: одразу сюди, без зайвого заходу на сервер (page.tsx робив те саме ще одним запитом)
  // Гість бачить вхід прямо на «/» (rewrite): так Google індексує головну з її назвою й описом,
  // а не «перенаправлення на /login» з текстом форми у видачі.
  if (path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/learn' : '/login';
    const next = user ? NextResponse.redirect(url) : NextResponse.rewrite(url, { request: { headers } });
    // оновлені куки сесії (refresh) мають дійти до браузера й тут
    response.cookies.getAll().forEach((c) => next.cookies.set(c));
    return next;
  }

  // Гість за публічним посиланням: стала «особистість» браузера на рік. Потрібна, щоб викладач
  // бачив його екран наживо (канал guest:<vid>), щоб зберігалися відповіді у вправах і щоб після
  // реєстрації переглянуті лекції переїхали на акаунт (claim_guest). Залогіненому — не треба.
  if (!user && /^\/s\/[A-Za-z0-9_-]{8,40}(\/|$)/.test(path) && !request.cookies.get(VID_COOKIE)?.value) {
    response.cookies.set({
      name: VID_COOKIE,
      value: crypto.randomUUID(),
      path: '/',
      maxAge: VID_MAX_AGE,
      sameSite: 'lax',
      httpOnly: false, // читає клієнт: назва каналу Realtime
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const isProtected =
    !isPublicQueueLesson &&
    PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Файли з /public (обкладинки, аудіо, шрифти, слайди) не потребують ні сесії, ні мови:
  // без цього кожна картинка лекції чекала на запит до Supabase Auth.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp3|m4a|ogg|wav|mp4|webm|woff2?|ttf|pdf|txt|xml|webmanifest)$).*)',
  ],
};
