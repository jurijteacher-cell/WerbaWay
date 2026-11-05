import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';

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
