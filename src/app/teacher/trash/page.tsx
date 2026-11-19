import Link from 'next/link';
import { requireTeacher } from '../results/requireTeacher';
import { loadPage } from '@/lib/pages/pages';
import { isMissingTable, isPendingPurge, type TrashRow } from '@/lib/pages/trash';
import { TrashRowActions } from '@/components/lesson/TrashButton';
import { getLocale, t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const when = (iso: string) => new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Кошик лекцій. Звідси — «Відновити» або «Видалити назавжди».
 * Видалена назавжди лекція одразу зникає з сайту; її файли з репо прибирає GitHub Action
 * purge-lectures (кожні ~15 хв), після чого сайт сам перезбирається.
 */
export default async function TrashPage() {
  const supabase = await requireTeacher('/teacher/trash');
  const locale = getLocale();
  const { data, error } = await supabase
    .from('lecture_trash')
    .select('slug, deleted_at, deleted_by, purged_at, file_hash')
    .order('deleted_at', { ascending: false });
  const rows = (data ?? []) as TrashRow[];
  const inTrash = rows.filter((r) => !r.purged_at && loadPage(r.slug));
  const purging = rows.filter(isPendingPurge);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-paper">{t("Кошик")}</h1>
        <Link href="/learn" className="ww-btn ww-btn-ghost ww-btn-sm">
          {t("← Лекції курсу")}
        </Link>
      </div>
      <p className="mb-8 text-paper-muted">
        {t("Лекції з кошика учні не бачать. Їх можна відновити або видалити назавжди — тоді сторінку, вправи, переклади й картинки буде прибрано з сайту.")}
      </p>

      {error && isMissingTable(error) && (
        <p className="mb-8 rounded-xl border border-[#f4b7c5] bg-[#fff4f6] px-4 py-3 text-sm text-paper">
          {t("Кошик ще не ввімкнено в базі (потрібна міграція 0017).")}
        </p>
      )}
      {error && !isMissingTable(error) && <p className="mb-8 text-incorrect">{error.message}</p>}

      {!error && inTrash.length === 0 && purging.length === 0 && <p className="text-paper-muted">{t("Кошик порожній.")}</p>}

      {inTrash.length > 0 && (
        <ul className="space-y-3">
          {inTrash.map((r) => {
            const meta = loadPage(r.slug, locale)?.meta;
            const title = meta?.title ?? r.slug;
            return (
              <li key={r.slug} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-line bg-ink-raised p-4 shadow-sm">
                <span aria-hidden="true" className="text-2xl">
                  {meta?.icon ?? '📘'}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/learn/${r.slug}`} className="font-display text-lg text-paper hover:text-gold-bright">
                    {title}
                  </Link>
                  <p className="text-xs text-paper-muted">
                    {[meta?.moduleTitle, meta?.level, t('у кошику з {date}', { date: when(r.deleted_at) })].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <TrashRowActions slug={r.slug} title={title} />
              </li>
            );
          })}
        </ul>
      )}

      {purging.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 font-display text-xl text-paper">{t("Видаляються з сайту")}</h2>
          <p className="mb-3 text-sm text-paper-muted">
            {t("Учні їх уже не бачать. Файли буде прибрано автоматично протягом приблизно пів години.")}
          </p>
          <ul className="space-y-1">
            {purging.map((r) => (
              <li key={r.slug} className="text-sm text-paper-muted">
                {loadPage(r.slug, locale)?.meta.title ?? r.slug} · {when(r.purged_at as string)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
