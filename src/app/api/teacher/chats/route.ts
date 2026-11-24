import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export type ChatSummary = {
  id: string;
  name: string;
  /** останнє повідомлення в розмові (без видалених) */
  last: { body: string; at: string; mine: boolean; kind: string } | null;
  /** непрочитані повідомлення учня */
  unread: number;
};

/** Усі розмови викладача з учнями: ім'я, останнє повідомлення, непрочитане. Учні без листування теж у списку — щоб почати чат. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [{ data: students }, { data: recent }, { data: unreadRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, first_name, last_name').neq('role', 'teacher').order('full_name'),
    supabase
      .from('class_messages')
      .select('student_id, sender_role, kind, body, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1500),
    supabase.from('class_messages').select('student_id').eq('sender_role', 'student').is('read_at', null).is('deleted_at', null).limit(5000),
  ]);

  const last = new Map<string, NonNullable<ChatSummary['last']>>();
  for (const m of recent ?? []) {
    const id = m.student_id as string;
    if (last.has(id)) continue;
    last.set(id, { body: m.body as string, at: m.created_at as string, mine: m.sender_role === 'teacher', kind: m.kind as string });
  }
  const unread = new Map<string, number>();
  for (const m of unreadRows ?? []) unread.set(m.student_id as string, (unread.get(m.student_id as string) ?? 0) + 1);

  const chats: ChatSummary[] = (students ?? []).map((s) => ({
    id: s.id as string,
    name: (s.full_name as string | null)?.trim() || [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || '—',
    last: last.get(s.id as string) ?? null,
    unread: unread.get(s.id as string) ?? 0,
  }));
  // спершу живі розмови (найсвіжіші зверху), потім учні без листування за алфавітом
  chats.sort((a, b) => {
    if (a.last && b.last) return a.last.at < b.last.at ? 1 : -1;
    if (a.last) return -1;
    if (b.last) return 1;
    return a.name.localeCompare(b.name, 'uk');
  });
  return NextResponse.json({ chats });
}
