import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, LOCALE_PARAM, LOCALES } from '@/i18n/config';

/**
 * Мова запиту: ?lang= (ембед у iframe куки не бачить) → кука → типова.
 * Кладемо її в заголовок, бо layout у Next не отримує searchParams, а мову
 * треба знати ще до рендера (<html lang>, словник інтерфейсу, глоси в лекції).
 */
function localeHeaders(request: NextRequest) {
  const param = request.nextUrl.searchParams.get(LOCALE_PARAM);
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = [param, cookie].find((x) => x && (LOCALES as readonly string[]).includes(x)) ?? DEFAULT_LOCALE;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return headers;
}

const PROTECTED_PREFIXES = ['/lessons', '/lectures', '/teacher', '/dashboard', '/class', '/learn', '/words'];

/** Public surfaces opened from Notion iframes — no auth, no Supabase round-trip. */
const PUBLIC_PREFIXES = ['/embed', '/slides', '/brand', '/api/embed'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const headers = localeHeaders(request);

  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next({ request: { headers } });
  }

  let response = NextResponse.next({ request: { headers } });

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
