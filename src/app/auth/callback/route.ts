import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

export const dynamic = 'force-dynamic';

/**
 * Повернення з Google (OAuth, PKCE): ?code=… → сесія в куках → `next` (за замовчуванням /learn).
 * Новому учневі ім'я й прізвище беремо з Google — інакше в списку учнів він був би безіменним.
 * Помилка або відмова на боці Google → /login?error=google.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const full = String(meta.full_name ?? meta.name ?? '').trim().replace(/\s+/g, ' ');
      if (full) {
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', data.user.id).maybeSingle();
        if (profile && !profile.first_name) {
          const [first, ...rest] = full.split(' ');
          await supabase
            .from('profiles')
            .update({ first_name: first, last_name: rest.join(' ') || null, full_name: full })
            .eq('id', data.user.id);
        }
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=google', origin));
}
