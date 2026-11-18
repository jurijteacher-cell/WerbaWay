import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UUID_RE, VID_COOKIE } from '@/lib/guest';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/touch { token, open?, seconds?, ua? } → { ok, num }
 * Пульс гостя на лекції за публічним посиланням: хто (кука ww_vid), яку лекцію (токен),
 * коли й скільки часу. Токен перевіряє сама функція guest_touch — без дійсного
 * посилання гість у базі не з'являється.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; open?: boolean; seconds?: number; ua?: string };
  try {
    // на виході зі сторінки шлемо keepalive-запит як text/plain
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const vid = req.cookies.get(VID_COOKIE)?.value;
  if (!vid || !UUID_RE.test(vid) || !body.token) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createClient();
  // учень з акаунтом гостем не рахується: його історія й відповіді вже йдуть в акаунт
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return NextResponse.json({ ok: false, reason: 'account' });

  const { data, error } = await supabase.rpc('guest_touch', {
    p_vid: vid,
    p_token: body.token,
    p_ua: typeof body.ua === 'string' ? body.ua.slice(0, 60) : null,
    p_seconds: Math.max(0, Math.min(900, Math.round(Number(body.seconds) || 0))),
    p_open: !!body.open,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json(data ?? { ok: false });
}
