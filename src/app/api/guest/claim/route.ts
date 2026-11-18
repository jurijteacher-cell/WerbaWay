import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UUID_RE, VID_COOKIE } from '@/lib/guest';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/claim → { result: ok | taken | none | teacher }
 * Гість зареєструвався або увійшов: переглянуті за посиланням лекції й відповіді у вправах
 * переїжджають на його акаунт (claim_guest). Куку ww_vid після цього прибираємо —
 * цей браузер більше не гість.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ result: 'auth' }, { status: 401 });

  const vid = req.cookies.get(VID_COOKIE)?.value;
  const clear = (res: NextResponse) => {
    res.cookies.set({ name: VID_COOKIE, value: '', path: '/', maxAge: 0, sameSite: 'lax' });
    return res;
  };
  if (!vid || !UUID_RE.test(vid)) return clear(NextResponse.json({ result: 'none' }));

  const { data, error } = await supabase.rpc('claim_guest', { p_vid: vid });
  // помилка бази — куку лишаємо, спробуємо наступного разу
  if (error) return NextResponse.json({ result: 'error' }, { status: 500 });
  return clear(NextResponse.json({ result: (data as string) ?? 'none' }));
}
