import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function ConfirmedPage({ searchParams }: { searchParams?: { error?: string } }) {
  const failed = searchParams?.error === '1';
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-sm">
        {failed ? (
          <>
            <h1 className="mb-2 font-display text-2xl text-paper">Посилання не спрацювало</h1>
            <p className="text-paper-muted">Воно застаріло або вже використане. Спробуй увійти або запроси новий лист.</p>
            <div className="mt-6 flex justify-center gap-6">
              <Link href="/login" className="text-gold hover:text-gold-bright">
                Увійти
              </Link>
              <Link href="/forgot-password" className="text-gold hover:text-gold-bright">
                Скинути пароль
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-2 font-display text-2xl text-paper">Пошту підтверджено</h1>
            <p className="text-paper-muted">
              Готово. Можна входити — на сайті або у вправах у Notion (там введи ті самі email і пароль).
            </p>
            <Link href="/login?next=/dashboard" className="mt-6 inline-block text-gold hover:text-gold-bright">
              Увійти
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
