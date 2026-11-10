import Link from 'next/link';
import { requireTeacher } from '../results/requireTeacher';
import { dayKey, fetchAttempts, fmtDate, pct, pctClass, summarize, type MockRow } from '@/lib/analytics';
import { Kpi, Section, WeakList } from '@/components/dashboard/parts';

export const dynamic = 'force-dynamic';

type Student = {
  id: string;
  name: string;
  user_id: string | null;
  code: string | null;
  first_total: number;
  first_ok: number;
  attempts: number;
  last_at: string | null;
  archived_at: string | null;
};

const DAY = 24 * 3600 * 1000;

export default async function TeacherAnalyticsPage() {
  const supabase = await requireTeacher('/teacher/analytics');
  const now = new Date();
  const since = new Date(now.getTime() - 60 * DAY).toISOString();

  const [{ data: studentRows }, attempts, { data: mockRows }] = await Promise.all([
    supabase.from('embed_student_stats').select('id, name, user_id, code, first_total, first_ok, attempts, last_at, archived_at'),
    fetchAttempts(supabase, { sinceIso: since }),
    supabase.from('mock_results').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  const students = ((studentRows ?? []) as Student[]).filter((s) => !s.archived_at);
  const nameByUser = new Map(students.filter((s) => s.user_id).map((s) => [s.user_id!, s]));

  const byStudent = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = byStudent.get(a.student_id) ?? [];
    list.push(a);
    byStudent.set(a.student_id, list);
  }

  const week = now.getTime() - 7 * DAY;
  const rows = students
    .map((s) => {
      const mine = byStudent.get(s.id) ?? [];
      const recent = mine.filter((a) => new Date(a.created_at).getTime() >= week);
      const rs = summarize(recent, now);
      return {
        s,
        n7: recent.length,
        days7: rs.activeDays,
        acc7: rs.accuracy,
        accAll: pct(s.first_ok, s.first_total),
        inactive: !s.last_at || new Date(s.last_at).getTime() < week,
      };
    })
    .sort((a, b) => b.n7 - a.n7 || (b.s.last_at ?? '').localeCompare(a.s.last_at ?? ''));

  const active = rows.filter((r) => r.n7 > 0).length;
  const classAll = summarize(attempts, now);
  const classWeek = summarize(
    attempts.filter((a) => new Date(a.created_at).getTime() >= week),
    now
  );
  const inactive = rows.filter((r) => r.inactive);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="mb-2 text-sm">
        <Link href="/teacher" className="text-paper-muted hover:text-gold">
          ← Кабінет
        </Link>
      </p>
      <h1 className="mb-2 font-display text-3xl text-paper">Аналітика класу</h1>
      <p className="mb-8 text-sm text-paper-muted">
        Дані з вправ у Notion за останні 60 днів; «тиждень» — останні 7 днів. % — правильно з першої спроби.{' '}
        <Link href="/teacher/results" className="text-gold hover:underline">
          Детальні результати →
        </Link>
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Активні за тиждень" value={`${active}/${rows.length}`} hint="учнів із відповідями" />
        <Kpi label="Перевірок за тиждень" value={classWeek.attempts} />
        <Kpi
          label="З першої (тиждень)"
          value={classWeek.accuracy == null ? '—' : `${classWeek.accuracy}%`}
          tone={pctClass(classWeek.accuracy)}
        />
        <Kpi label="Без активності 7+ днів" value={inactive.length} tone={inactive.length ? 'text-incorrect' : 'text-paper'} />
      </div>

      <Section title="Учні">
        {rows.length === 0 ? (
          <p className="text-sm text-paper-muted">Поки нікого.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Учень</th>
                  <th className="px-4 py-3 font-normal">Тиждень: перевірок</th>
                  <th className="px-4 py-3 font-normal">Днів</th>
                  <th className="px-4 py-3 font-normal">З першої (тиждень)</th>
                  <th className="px-4 py-3 font-normal">З першої (всього)</th>
                  <th className="px-4 py-3 font-normal">Остання активність</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, n7, days7, acc7, accAll, inactive: idle }) => (
                  <tr key={s.id} className="border-t border-ink-line hover:bg-ink-raised/60">
                    <td className="px-4 py-3">
                      <Link href={`/teacher/results/${s.id}`} className="text-paper hover:text-gold">
                        {s.name}
                      </Link>
                      {!s.user_id ? <p className="text-xs text-paper-muted">ще без акаунта</p> : null}
                    </td>
                    <td className="px-4 py-3 text-paper">{n7 || '—'}</td>
                    <td className="px-4 py-3 text-paper-muted">{days7 || '—'}</td>
                    <td className={`px-4 py-3 font-mono ${pctClass(acc7)}`}>{acc7 == null ? '—' : `${acc7}%`}</td>
                    <td className={`px-4 py-3 font-mono ${pctClass(accAll)}`}>{accAll == null ? '—' : `${accAll}%`}</td>
                    <td className={`px-4 py-3 ${idle ? 'text-incorrect' : 'text-paper-muted'}`}>{fmtDate(s.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Слабкі теми класу">
        <WeakList weak={classAll.weak} />
      </Section>

      <Section title="Пробні іспити">
        {!mockRows || mockRows.length === 0 ? (
          <p className="text-sm text-paper-muted">Ще немає результатів, збережених в акаунтах.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Учень</th>
                  <th className="px-4 py-3 font-normal">Іспит</th>
                  <th className="px-4 py-3 font-normal">Бали</th>
                  <th className="px-4 py-3 font-normal">Результат</th>
                  <th className="px-4 py-3 font-normal">Коли</th>
                </tr>
              </thead>
              <tbody>
                {(mockRows as MockRow[]).map((m) => {
                  const st = nameByUser.get(m.user_id);
                  return (
                    <tr key={m.id} className="border-t border-ink-line">
                      <td className="px-4 py-3 text-paper">
                        {st ? (
                          <Link href={`/teacher/results/${st.id}`} className="hover:text-gold">
                            {st.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-paper-muted">{m.exam_label ?? m.lesson_id}</td>
                      <td className="px-4 py-3 font-mono text-paper">
                        {m.total}/{m.max_total}
                      </td>
                      <td className={`px-4 py-3 ${m.passed ? 'text-correct' : 'text-incorrect'}`}>
                        {m.level ?? (m.passed ? 'zdane' : 'poniżej progu')}
                      </td>
                      <td className="px-4 py-3 text-paper-muted">{fmtDate(m.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <p className="text-xs text-paper-muted">Сьогодні: {dayKey(now)}</p>
    </main>
  );
}
