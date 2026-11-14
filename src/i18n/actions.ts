'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { asLocale, LOCALE_COOKIE, type Locale } from './config';

const YEAR = 60 * 60 * 24 * 365;

/** Мова живе в куці (швидко) і дублюється в профілі (щоб їхала за людиною). */
export async function setLocale(next: string) {
  const locale: Locale = asLocale(next);
  cookies().set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: YEAR,
    sameSite: 'lax',
  });

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ locale }).eq('id', user.id);
  } catch {
    // профіль — лише синхронізація між пристроями; кука вже стоїть, сторінка працює
  }

  revalidatePath('/', 'layout');
  return locale;
}
