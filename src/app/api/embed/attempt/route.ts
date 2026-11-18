import { NextRequest, NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/user-token';
import { createClient } from '@/lib/supabase/server';
import { UUID_RE, VID_COOKIE } from '@/lib/guest';

export const dynamic = 'force-dynamic';

type Attempt = {
  lessonId?: string;
  embed?: string;
  blockId?: string | null;
  itemId?: string;
  itemType?: string | null;
  grammarPoint?: string | null;
  prompt?: string | null;
  answer?: string | null;
  expected?: string | null;
  correct?: boolean | null;
};

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? null : String(v));

/**
 * POST /api/embed/attempt  { token, attempts } | { guest: true, attempts } → { saved }
 * `token` is the student's Supabase access token (sendBeacon cannot set headers).
 * The RPC derives the student from the token, so nobody can write under someone else's account.
 *
 * `guest: true` — гість за публічним посиланням /s/<token>: акаунта немає, тому пишемо під
 * куку ww_vid (її надсилає лише наш сайт). Якщо сесія все ж є — пишемо в акаунт.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; guest?: boolean; attempts?: Attempt[] };
  try {
    // sendBeacon sends text/plain — parse manually
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const attempts = Array.isArray(body.attempts) ? body.attempts.slice(0, 50) : [];
  if ((!body.token && !body.guest) || !attempts.length) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (!body.token) return guestAttempts(req, attempts);

  const supabase = createUserClient(body.token);
  const { data: u, error: uerr } = await supabase.auth.getUser(body.token);
  if (uerr || !u.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let saved = 0;
  for (const a of attempts) {
    const { data, error } = await supabase.rpc('embed_record_attempt_me', {
      p_lesson_id: str(a.lessonId),
      p_embed: str(a.embed),
      p_block_id: str(a.blockId),
      p_item_id: str(a.itemId),
      p_item_type: str(a.itemType),
      p_grammar_point: str(a.grammarPoint),
      p_prompt: str(a.prompt),
      p_answer: str(a.answer),
      p_expected: str(a.expected),
      p_is_correct: typeof a.correct === 'boolean' ? a.correct : null,
    });
    if (error) return NextResponse.json({ error: 'db', saved }, { status: 500 });
    if (data === false) continue; // rejected by validation — skip, do not retry forever
    saved++;
  }
  return NextResponse.json({ saved });
}

/** Відповіді гостя: під куку ww_vid, а якщо в цьому браузері вже є сесія — під акаунт. */
async function guestAttempts(req: NextRequest, attempts: Attempt[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const vid = req.cookies.get(VID_COOKIE)?.value;
  if (!user && (!vid || !UUID_RE.test(vid))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let saved = 0;
  for (const a of attempts) {
    const args = {
      p_lesson_id: str(a.lessonId),
      p_embed: str(a.embed),
      p_block_id: str(a.blockId),
      p_item_id: str(a.itemId),
      p_item_type: str(a.itemType),
      p_grammar_point: str(a.grammarPoint),
      p_prompt: str(a.prompt),
      p_answer: str(a.answer),
      p_expected: str(a.expected),
      p_is_correct: typeof a.correct === 'boolean' ? a.correct : null,
    };
    const { data, error } = user
      ? await supabase.rpc('embed_record_attempt_me', args)
      : await supabase.rpc('guest_record_attempt', { p_vid: vid, ...args });
    if (error) return NextResponse.json({ error: 'db', saved }, { status: 500 });
    if (data === false) continue; // rejected by validation — skip, do not retry forever
    saved++;
  }
  return NextResponse.json({ saved });
}
