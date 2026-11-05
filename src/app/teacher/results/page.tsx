import Link from 'next/link';
import { requireTeacher } from './requireTeacher';
import { NewStudentForm } from './NewStudentForm';
import { fmt, pct, pctClass } from './format';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  code: string;
  name: string;
  note: string | null;
  archived_at: string | null;
  self_created?: boolean;
  attempts: number;
  first_total: number;
  first_ok: number;
  open_answers: number;
  lessons: number;
  last_at: string | null;
};

function PctBadge({ ok, total }: { ok: number; total: number }) {
  const p = pct(ok, total);
  if (p == null) return <span className="text-paper-muted">—</span>;
  return <span className={`font-mono ${pctClass(p)}`}>{p}%</span>;
}

export default async function ResultsPage({ searchParams }: { searchParams?: { archived?: string } }) {
  const supabase = await requireTeacher();
  const showArchived = searchParams?.archived === '1';

  const { data, error } = await supabase
    .from('embed_student_stats')
    .select('*')
    .order('last_at', { ascending: false, nullsFirst: false });

  const rows = ((data ?? []) as Row[]).filter((r) => (showArchived ? r.archived_at : !r.archived_at));

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="mb-2 text-sm">
        <Link href="/teacher" className="text-paper-muted hover:text-gold">
          ← Кабінет
        </Link>
      </p>
      <h1 className="mb-2 font-display text-3xl text-paper">Результати учнів</h1>
      <p className="mb-8 text-sm text-paper-muted">
        Усі «Sprawdź» з ембедів у Notion (граматика, домашка, egzamin). % — правильно з першої спроби.
      </p>

      {error && (
        <p className="mb-6 text-incorrect">
          Помилка: {error.message}. Якщо таблиці ще немає — виконайте міграцію 0005_embed_results.sql у Supabase.
        </p>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl text-paper">Новий учень</h2>
        <NewStudentForm />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl text-paper">{showArchived ? 'Архів' : 'Учні'}</h2>
          <Link
            href={showArchived ? '/teacher/results' : '/teacher/results?archived=1'}
            className="text-sm text-paper-muted hover:text-gold"
          >
            {showArchived ? 'Активні →' : 'Архів →'}
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-paper-muted">Поки нікого.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Учень</th>
                  <th className="px-4 py-3 font-normal">Код</th>
                  <th className="px-4 py-3 font-normal">Уроків</th>
                  <th className="px-4 py-3 font-normal">З першої спроби</th>
                  <th className="px-4 py-3 font-normal">Письмо</th>
                  <th className="px-4 py-3 font-normal">Остання активність</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-ink-line hover:bg-ink-raised/60">
                    <td className="px-4 py-3">
                      <Link href={`/teacher/results/${r.id}`} className="text-paper hover:text-gold">
                        {r.name}
                      </Link>
                      {r.note ? <p className="text-xs text-paper-muted">{r.note}</p> : null}
                      {r.self_created ? <p className="text-xs text-paper-muted">створив(ла) код сам(а)</p> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-gold">{r.code}</td>
                    <td className="px-4 py-3 text-paper">{r.lessons}</td>
                    <td className="px-4 py-3">
                      <PctBadge ok={r.first_ok} total={r.first_total} />{' '}
                      <span className="text-xs text-paper-muted">
                        ({r.first_ok}/{r.first_total})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-paper">{r.open_answers || '—'}</td>
                    <td className="px-4 py-3 text-paper-muted">{fmt(r.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
