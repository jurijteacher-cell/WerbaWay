import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { makeCode } from '@/lib/student-code';

export const dynamic = 'force-dynamic';

/** GET /api/embed/student?code=ANNA7 → { name } або 404 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return NextResponse.json({ error: 'bad code' }, { status: 400 });
  }
  const { data, error } = await createAnonClient().rpc('embed_student_name', { p_code: code });
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ name: data as string });
}

/** POST /api/embed/student { name } → { code, name } — учень сам створює собі код */
export async function POST(req: NextRequest) {
  let name = '';
  try {
    name = String(((await req.json()) as { name?: unknown }).name ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  } catch {
    /* empty body */
  }
  if (name.length < 2) return NextResponse.json({ error: 'name' }, { status: 400 });

  const supabase = createAnonClient();
  for (let i = 0; i < 8; i++) {
    const code = makeCode(name);
    const { data, error } = await supabase.rpc('embed_create_student', { p_name: name, p_code: code });
    if (error) {
      const busy = /too many signups/.test(error.message);
      return NextResponse.json({ error: busy ? 'busy' : 'db' }, { status: busy ? 429 : 500 });
    }
    if (data === true) return NextResponse.json({ code, name });
  }
  return NextResponse.json({ error: 'no free code' }, { status: 409 });
}
