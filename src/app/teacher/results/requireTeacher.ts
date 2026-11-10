import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireTeacher(next = '/teacher/results') {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') redirect('/');
  return supabase;
}
