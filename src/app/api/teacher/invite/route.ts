import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buttonLetterHtml, mailConfigured, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * «Запросити учня»: викладач вводить пошту → Supabase створює акаунт-запрошення (без пароля)
 * → ми самі шлемо лист через Resend з посиланням token_hash → /auth/confirm (type=invite) → /welcome,
 * де учень дописує ім'я, прізвище й пароль.
 * Лист шлемо не шаблоном Supabase «Invite user», а своїм: текст і посилання повністю наші,
 * і не залежать від того, коли Supabase підхопить шаблони.
 * Повторне запрошення на ту саму адресу (учень ще не завершив реєстрацію) — нове посилання.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: teacher } = await supabase.rpc('is_teacher');
  if (!teacher) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'bad email' }, { status: 400 });

  if (!mailConfigured()) return NextResponse.json({ error: 'mail not configured' }, { status: 503 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'admin not configured' }, { status: 503 });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { invited_by: user.id } },
  });
  if (error || !data?.properties?.hashed_token || !data.user) {
    if (error && /already been registered|already registered|email_exists/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`)) {
      return NextResponse.json({ error: 'exists', userId: await findUserId(admin, email) }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message ?? 'invite failed' }, { status: 502 });
  }

  // поки учень не назвався, у списку учнів видно його пошту, а не безликого «Учня»
  await admin.from('profiles').update({ full_name: email }).eq('id', data.user.id).is('first_name', null);

  const origin = new URL(req.url).origin;
  const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite&next=/welcome`;
  const html = buttonLetterHtml({
    title: 'Запрошення до Werba Way',
    lead: 'Тебе запрошено на заняття польською у Werba Way. Натисни кнопку, напиши своє ім’я та прізвище й придумай пароль — і акаунт готовий.',
    button: 'Завершити реєстрацію',
    link,
    note: 'Посилання особисте й діє обмежений час. Якщо воно вже не працює, попроси викладача надіслати запрошення ще раз.',
    pl: 'Zaproszenie do Werba Way. Kliknij przycisk powyżej, wpisz imię i nazwisko i ustaw hasło. Link jest osobisty i ważny przez ograniczony czas.',
  });
  const text = [
    'Запрошення до Werba Way',
    '',
    'Тебе запрошено на заняття польською у Werba Way. Відкрий посилання, напиши ім’я та прізвище й придумай пароль:',
    link,
    '',
    'Посилання особисте й діє обмежений час.',
    '',
    '— Werba Way',
    'https://www.werbaway.com',
  ].join('\n');

  const r = await sendEmail({
    to: email,
    subject: 'Werba Way: запрошення · Zaproszenie',
    text,
    html,
    replyTo: user.email ?? undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.error, userId: data.user.id }, { status: 502 });
  return NextResponse.json({ ok: true, userId: data.user.id, email });
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

async function findUserId(admin: Admin, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (!data || data.users.length < 1000) break;
  }
  return null;
}
