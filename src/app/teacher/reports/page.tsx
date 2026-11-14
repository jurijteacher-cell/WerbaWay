import { requireTeacher } from '../results/requireTeacher';
import { lessonTitle } from '@/lib/lesson-titles';
import { ResolveButton } from './ResolveButton';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  created_at: string;
  message: string;
  page_url: string | null;
  lesson_slug: string | null;
  resolved_at: string | null;
  profiles: { full_name: string | null; first_name: string | null; last_name: string | null } | null;
};

export default async function ReportsPage() {
  const supabase = await requireTeacher('/teacher/reports');
  const { data } = await supabase
    .from('bug_reports')
    .select('id, created_at, message, page_url, lesson_slug, resolved_at, profiles:reporter_id(full_name, first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];
  const open = rows.filter((r) => !r.resolved_at);
  const closed = rows.filter((r) => r.resolved_at);

  const card = (r: Row) => {
    const p = r.profiles;
    const name = p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || t("Учень");
    return (
      <li key={r.id} className="rounded-2xl border border-ink-line bg-ink-raised p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-display font-semibold text-paper">{name}</span>
          <span className="text-xs text-paper-faint">
            {new Date(r.created_at).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] text-paper">{r.message}</p>
        <p className="mt-2 text-xs text-paper-muted">
          {r.lesson_slug ? `${lessonTitle(r.lesson_slug) ?? r.lesson_slug} · ` : ''}
          {r.page_url ? (
            <a href={r.page_url} className="text-gold underline-offset-2 hover:underline">
              відкрити сторінку
            </a>
          ) : null}
        </p>
        {!r.resolved_at && (
          <div className="mt-3">
            <ResolveButton id={r.id} />
          </div>
        )}
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-paper">{t("Повідомлення про помилки")}</h1>
      <p className="mt-1 text-sm text-paper-muted">{t("Те, що учні надсилають кнопкою «Помилка?» з будь-якої сторінки.")}</p>

      <h2 className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-paper-faint">
        Нерозібрані · {open.length}
      </h2>
      {open.length === 0 ? (
        <p className="mt-2 text-sm text-paper-muted">{t("Порожньо.")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">{open.map(card)}</ul>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="mt-9 text-[11px] font-bold uppercase tracking-[0.14em] text-paper-faint">
            Розібрані · {closed.length}
          </h2>
          <ul className="mt-3 flex flex-col gap-3 opacity-70">{closed.map(card)}</ul>
        </>
      )}
    </main>
  );
}
