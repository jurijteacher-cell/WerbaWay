import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { letterHtml, mailConfigured, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Чи можна написати учню: пошта налаштована й у нього є адреса. Адресу викладачеві показуємо. */
export async function GET(req: Request) {
  const gate = await teacherOnly();
  if ('res' in gate) return gate.res;
  const id = new URL(req.url).searchParams.get('studentId') ?? '';
  if (!UUID.test(id)) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const email = await studentEmail(id);
  return NextResponse.json({ configured: mailConfigured(), email });
}

/** Лист учню від викладача. Відповідь учня приходить на пошту викладача (reply_to). */
export async function POST(req: Request) {
  const gate = await teacherOnly();
  if ('res' in gate) return gate.res;
  const body = (await req.json().catch(() => ({}))) as { studentId?: string; subject?: string; message?: string };
  const subject = (body.subject ?? '').trim().slice(0, 200);
  const message = (body.message ?? '').trim().slice(0, 20_000);
  if (!body.studentId || !UUID.test(body.studentId) || !subject || !message)
    return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const to = await studentEmail(body.studentId);
  if (!to) return NextResponse.json({ error: 'no email' }, { status: 404 });

  const r = await sendEmail({
    to,
    subject,
    text: `${message}\n\n— Werba Way\nhttps://www.werbaway.com`,
    html: letterHtml(message, 'Werba Way'),
    replyTo: gate.email ?? undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, to });
}

async function teacherOnly(): Promise<{ res: NextResponse } | { email: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: teacher } = await supabase.rpc('is_teacher');
  if (!teacher) return { res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { email: user.email ?? null };
}

async function studentEmail(id: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.auth.admin.getUserById(id);
  return data.user?.email ?? null;
}
