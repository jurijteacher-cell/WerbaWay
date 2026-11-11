import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchAttempts, fmtDate, pctClass, summarize, type MockRow } from '@/lib/analytics';
import { listPages } from '@/lib/pages/pages';
import { Activity, EmbedBreakdown, Kpi, Section, WeakList } from '@/components/dashboard/parts';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  const [{ data: profile }, attempts, { data: mocks }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    fetchAttempts(supabase), // RLS: only this user's own attempts
    supabase.from('mock_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
  ]);

  // Історія лекцій і домашка (таблиця lesson_progress; якщо її ще нема — просто порожньо)
  const { data: progressRows } = await supabase
    .from('lesson_progress')
    .select('lesson_slug, completed_at, homework_assigned_at, homework_done_at')
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false });
  const titles = new Map(listPages().map((p) => [p.slug, p]));
  const history = (progressRows ?? []).map((r) => ({
    ...r,
    title: titles.get(r.lesson_slug as string)?.title ?? (r.lesson_slug as string),
    level: titles.get(r.lesson_slug as string)?.level,
    hasPage: titles.has(r.lesson_slug as string),
  }));
  const homeworkTodo = history.filter((h) => h.homework_assigned_at && !h.homework_done_at);

  const s = summarize(attempts);
  const isTeacher = profile?.role === 'teacher';
  const name = profile?.full_name || user.email;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-gold-dim">Мій прогрес</p>
          <h1 className="font-display text-3xl text-paper">{name}</h1>
          <p className="mt-1 text-sm text-paper-muted">{user.email}</p>
        </div>
        <div className="flex gap-4 text-sm">
          {isTeacher ? (
            <>
              <Link href="/teacher/class" className="text-gold hover:text-gold-bright">
                Клас наживо →
              </Link>
              <Link href="/teacher/analytics" className="text-gold hover:text-gold-bright">
                Аналітика класу →
              </Link>
            </>
          ) : (
            <Link href="/class" className="text-gold hover:text-gold-bright">
              Увійти в клас →
            </Link>
          )}
          <Link href="/forgot-password" className="text-paper-muted hover:text-gold">
            Змінити пароль
          </Link>
        </div>
      </div>

      {isTeacher ? (
        <p className="mb-8 rounded-lg border border-ink-line p-4 text-sm text-paper-muted">
          Це особистий прогрес. Відповіді з акаунта викладача не записуються — дивись результати учнів в аналітиці класу.
        </p>
      ) : null}

      {homeworkTodo.length > 0 && (
        <Section title={`Домашка (${homeworkTodo.length})`}>
          <div className="flex flex-col gap-2">
            {homeworkTodo.map((h) => (
              <Link
                key={h.lesson_slug as string}
                href={`/learn/${h.lesson_slug}/hw`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gold/50 bg-ink-raised px-4 py-3 transition-colors hover:border-gold"
              >
                <span className="text-paper">📝 {h.title}</span>
                <span className="text-sm text-paper-muted">задано {fmtDate(h.homework_assigned_at as string)} →</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="Історія лекцій">
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Лекція</th>
                  <th className="px-4 py-3 font-normal">Пройдено</th>
                  <th className="px-4 py-3 font-normal">Домашка</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.lesson_slug as string} className="border-t border-ink-line">
                    <td className="px-4 py-3 text-paper">
                      {h.hasPage ? (
                        <Link href={`/learn/${h.lesson_slug}`} className="hover:text-gold">
                          {h.title}
                        </Link>
                      ) : (
                        h.title
                      )}
                      {h.level && <span className="ml-2 font-mono text-xs text-gold-dim">{h.level}</span>}
                    </td>
                    <td className="px-4 py-3 text-paper-muted">{fmtDate(h.completed_at as string)}</td>
                    <td className="px-4 py-3">
                      {!h.homework_assigned_at ? (
                        <span className="text-paper-muted">—</span>
                      ) : h.homework_done_at ? (
                        <span className="text-correct">✓ здано {fmtDate(h.homework_done_at as string)}</span>
                      ) : (
                        <Link href={`/learn/${h.lesson_slug}/hw`} className="text-gold hover:text-gold-bright">
                          виконати →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {s.attempts === 0 ? (
        <p className="rounded-xl border border-ink-line bg-ink-raised p-6 text-paper-muted">
          Поки немає жодної відповіді. Виконай вправи у Notion, увійшовши з цим email, — і тут з’явиться прогрес.
        </p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="З першої спроби"
              value={s.accuracy == null ? '—' : `${s.accuracy}%`}
              tone={pctClass(s.accuracy)}
              hint={`${s.firstOk} з ${s.firstTotal}`}
            />
            <Kpi label="Вправ" value={s.exercises} hint={`${s.attempts} перевірок`} />
            <Kpi label="Уроків" value={s.lessons} />
            <Kpi label="Серія днів" value={s.streak} hint={`активних днів: ${s.activeDays}`} />
          </div>

          <Section title="Активність (28 днів)">
            <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
              <Activity daily={s.daily} />
            </div>
          </Section>

          <div className="grid gap-8 md:grid-cols-2">
            <Section title="Слабкі теми">
              <WeakList weak={s.weak} />
            </Section>
            <Section title="За типом вправ">
              <EmbedBreakdown byEmbed={s.byEmbed} />
            </Section>
          </div>

          <Section title="Останні уроки">
            <div className="overflow-x-auto rounded-xl border border-ink-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-raised text-paper-muted">
                  <tr>
                    <th className="px-4 py-3 font-normal">Урок</th>
                    <th className="px-4 py-3 font-normal">Спроб</th>
                    <th className="px-4 py-3 font-normal">З першої</th>
                    <th className="px-4 py-3 font-normal">Коли</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentLessons.map((l) => (
                    <tr key={l.lessonId} className="border-t border-ink-line">
                      <td className="px-4 py-3 text-paper">{l.title}</td>
                      <td className="px-4 py-3 text-paper-muted">{l.attempts}</td>
                      <td className={`px-4 py-3 font-mono ${pctClass(l.pct)}`}>{l.pct == null ? '—' : `${l.pct}%`}</td>
                      <td className="px-4 py-3 text-paper-muted">{fmtDate(l.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {mocks && mocks.length > 0 ? (
        <Section title="Пробні іспити">
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Іспит</th>
                  <th className="px-4 py-3 font-normal">Бали</th>
                  <th className="px-4 py-3 font-normal">Результат</th>
                  <th className="px-4 py-3 font-normal">Хв</th>
                  <th className="px-4 py-3 font-normal">Коли</th>
                </tr>
              </thead>
              <tbody>
                {(mocks as MockRow[]).map((m) => (
                  <tr key={m.id} className="border-t border-ink-line">
                    <td className="px-4 py-3 text-paper">{m.exam_label ?? m.lesson_id}</td>
                    <td className="px-4 py-3 font-mono text-paper">
                      {m.total}/{m.max_total}
                    </td>
                    <td className={`px-4 py-3 ${m.passed ? 'text-correct' : 'text-incorrect'}`}>
                      {m.level ?? (m.passed ? 'zdane' : 'poniżej progu')}
                    </td>
                    <td className="px-4 py-3 text-paper-muted">{m.minutes ? Math.round(Number(m.minutes)) : '—'}</td>
                    <td className="px-4 py-3 text-paper-muted">{fmtDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </main>
  );
}
