import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Головна — це «Курс». Старий список уроків (демо «Вітання») більше не показуємо. */
export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/learn' : '/login');
}
