import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

/**
 * Landing point of the links in Supabase e-mails (token_hash flow — works even when the link
 * is opened in another browser than the one that asked for it, unlike PKCE).
 *   signup   → /auth/confirmed
 *   recovery → /reset-password
 *   invite   → /welcome (запрошення від викладача, /api/teacher/invite)
 * Template: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const fallback = type === 'recovery' ? '/reset-password' : type === 'invite' ? '/welcome' : '/auth/confirmed';
  const next = safeNext(searchParams.get('next'), fallback);

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  // запрошення: своя сторінка з поясненням «попроси викладача надіслати ще раз»
  return NextResponse.redirect(new URL(type === 'invite' ? '/welcome?error=1' : '/auth/confirmed?error=1', origin));
}
