import { NextRequest, NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/user-token';
import { createAdminClient } from '@/lib/supabase/admin';
import { PHOTO_BUCKET } from '@/lib/answer-photos';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * POST /api/embed/photo (multipart: token, file) → { path }
 * Фото до письмової відповіді. Учень впізнається за токеном Supabase (вправа може бути в iframe,
 * де куки не їдуть). Файл кладемо в приватний бакет під `<uid>/<uuid>.jpg`; читає його лише викладач
 * через підписане посилання (див. teacher/results).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad form' }, { status: 400 });
  }
  const token = String(form.get('token') ?? '');
  const file = form.get('file');
  if (!token || !(file instanceof File)) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: 'type' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'size' }, { status: 413 });

  const user = createUserClient(token);
  const { data: u, error } = await user.auth.getUser(token);
  if (error || !u.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'storage' }, { status: 503 });

  // клієнт стискає знімок у JPEG; PNG/WebP з інших шляхів теж приймаємо, але зберігаємо під .jpg-ім'ям лише JPEG
  const path = `${u.user.id}/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: 'upload' }, { status: 500 });
  return NextResponse.json({ path });
}
