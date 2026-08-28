import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './LogoutButton';

export async function TopNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isTeacher = profile?.role === 'teacher';

  return (
    <header className="border-b border-ink-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-lg text-gold">
          Werba Way
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-paper-muted transition-colors hover:text-gold">
            Уроки
          </Link>
          <Link href="/lectures" className="text-paper-muted transition-colors hover:text-gold">
            Лекції
          </Link>
          {isTeacher && (
            <Link href="/teacher" className="text-paper-muted transition-colors hover:text-gold">
              Кабінет викладача
            </Link>
          )}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
