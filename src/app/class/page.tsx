import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClassStudent } from '@/components/class/ClassStudent';
import { EMPTY_ROOM, type RoomState } from '@/lib/class/protocol';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export default async function ClassPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/class');

  const [{ data: profile }, { data: room }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('class_rooms').select('active, lesson_id, embed, blocks').eq('student_id', user.id).maybeSingle(),
  ]);
  const name = profile?.full_name || user.email?.split('@')[0] || t("Учень");

  return <ClassStudent userId={user.id} name={name} initialRoom={(room as RoomState | null) ?? EMPTY_ROOM} />;
}
