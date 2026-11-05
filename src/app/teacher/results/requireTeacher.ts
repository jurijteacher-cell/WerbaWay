import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireTeacher() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/teacher/results');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') redirect('/');
  return supabase;
}
