import type { SupabaseClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Lang = 'uk' | 'ru' | 'en' | 'pl';

type Owner =
  | { ok: true; userId: string; role: 'teacher' | 'student'; ownerId: string; lang: Lang }
  | { ok: false; status: number; error: string };

/**
 * Чия колода: учень — завжди своя; викладач — колода учня `studentId` (слово «в класі»),
 * без studentId — власна. Мова перекладу — мова, яку власник колоди обрав на сайті.
 */
export async function resolveOwner(supabase: SupabaseClient, studentId?: string | null): Promise<Owner> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'unauthorized' };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = me?.role === 'teacher' ? 'teacher' : 'student';
  const ownerId = role === 'teacher' && studentId && UUID.test(studentId) ? studentId : user.id;
  const { data: p } = await supabase.from('profiles').select('locale').eq('id', ownerId).maybeSingle();
  const lang = (['uk', 'ru', 'en', 'pl'].includes(p?.locale as string) ? p?.locale : 'uk') as Lang;
  return { ok: true, userId: user.id, role, ownerId, lang };
}
