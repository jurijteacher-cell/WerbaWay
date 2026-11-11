import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '../../results/requireTeacher';
import { fmt, pctClass } from '../../results/format';
import type { ItemResult, SectionResult, TaskResult, WritingResult } from '@/lib/mock-exam/core';

export const dynamic = 'force-dynamic';

type StoredScore = {
  sections?: SectionResult[];
  pending?: number;
  weak?: string[];
  tasks?: TaskResult[];
  writing?: WritingResult[];
};

type MockRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  exam_label: string | null;
  scoring: string | null;
  total: number;
  max_total: number;
  level: string | null;
  passed: boolean | null;
  minutes: number | null;
  score: StoredScore | null;
  created_at: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const num = (n: number | string) => {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
};

function ItemRow({ r }: { r: ItemResult }) {
  const tone =
    r.status === 'ok' ? 'border-correct/50' : r.status === 'check' ? 'border-gold/60' : 'border-incorrect/60';
  const given = r.status === 'empty' || !r.given ? '— (без відповіді)' : r.given;
  const givenCls =
    r.status === 'ok' ? 'text-correct' : r.status === 'check' ? 'text-gold' : 'text-incorrect';
  return (
    <li className={`border-l-2 pl-3 ${tone}`}>
      <p className="text-paper-muted">
        <span className="mr-2 font-mono text-paper">{r.n}.</span>
        {r.label}
      </p>
      <p className="mt-0.5">
        <span className="text-xs text-paper-muted">учень: </span>
        <span className={givenCls}>{given}</span>
        {r.status !== 'ok' ? (
          <>
            <span className="mx-2 text-paper-muted">→</span>
            <span className="text-xs text-paper-muted">{r.status === 'check' ? 'зразок: ' : 'правильно: '}</span>
            <span className="text-correct">{r.expected}</span>
          </>
        ) : null}
        {r.status === 'check' ? <span className="ml-2 text-xs text-gold">перевірити вручну</span> : null}
        {r.note ? <span className="ml-2 text-xs text-paper-muted">({r.note})</span> : null}
      </p>
    </li>
  );
}

export default async function ExamDetailPage({ params }: { params: { id: string } }) {
  const supabase = await requireTeacher(`/teacher/exams/${params.id}`);
  if (!UUID.test(params.id)) notFound();

  const { data } = await supabase.from('mock_results').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  const row = data as MockRow;

  const { data: student } = await supabase
    .from('embed_student_stats')
    .select('id, name')
    .eq('user_id', row.user_id)
    .maybeSingle();
  let studentName: string | null = student?.name ?? null;
  if (!studentName) {
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', row.user_id).maybeSingle();
    studentName = prof?.full_name ?? null;
  }

  const score = row.score ?? {};
  const sections = score.sections ?? [];
  const tasks = (score.tasks ?? []).filter((t) => t.items.length > 0);
  const writing = score.writing ?? [];
  const hasDetail = Array.isArray(score.tasks);

  const allItems = tasks.flatMap((t) => t.items);
  const wrongCount = allItems.filter((r) => r.status === 'no').length;
  const emptyCount = allItems.filter((r) => r.status === 'empty').length;
  const checkCount = allItems.filter((r) => r.status === 'check').length;

  const backHref = student ? `/teacher/results/${student.id}` : '/teacher/analytics';

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="mb-2 text-sm">
        <Link href={backHref} className="text-paper-muted hover:text-gold">
          ← {student ? studentName : 'Аналітика'}
        </Link>
      </p>
      <h1 className="font-display text-3xl text-paper">{row.exam_label ?? row.lesson_id}</h1>
      <p className="mt-1 text-sm text-paper-muted">
        {studentName ?? 'Учень'} · {fmt(row.created_at)}
        {row.minutes ? ` · ${num(row.minutes)} хв` : ''}
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
          <p className="text-xs uppercase tracking-wider text-paper-muted">Бали</p>
          <p className="mt-1 font-display text-3xl text-paper">
            {num(row.total)}/{num(row.max_total)}
          </p>
        </div>
        <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
          <p className="text-xs uppercase tracking-wider text-paper-muted">Результат</p>
          <p className={`mt-1 font-display text-3xl ${row.passed ? 'text-correct' : 'text-incorrect'}`}>
            {row.level ?? (row.passed ? 'zdane' : 'poniżej progu')}
          </p>
        </div>
        <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
          <p className="text-xs uppercase tracking-wider text-paper-muted">Помилок</p>
          <p className={`mt-1 font-display text-3xl ${wrongCount + emptyCount ? 'text-incorrect' : 'text-correct'}`}>
            {hasDetail ? wrongCount + emptyCount : '—'}
          </p>
          {hasDetail && emptyCount ? (
            <p className="mt-1 text-xs text-paper-muted">з них без відповіді: {emptyCount}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
          <p className="text-xs uppercase tracking-wider text-paper-muted">Перевірити вручну</p>
          <p className={`mt-1 font-display text-3xl ${row.score?.pending ? 'text-gold' : 'text-paper'}`}>
            {row.score?.pending ?? 0}
          </p>
          {hasDetail && checkCount ? <p className="mt-1 text-xs text-paper-muted">відкритих відповідей: {checkCount}</p> : null}
        </div>
      </section>

      {sections.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl text-paper">Секції</h2>
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <tbody>
                {sections.map((s) => {
                  const p = s.max ? Math.round((s.points / s.max) * 100) : null;
                  return (
                    <tr key={s.id} className="border-t border-ink-line first:border-t-0">
                      <td className="px-4 py-3 text-paper">{s.title}</td>
                      <td className="px-4 py-3 font-mono text-paper">
                        {s.manual ? (s.manual_points ? `макс. ${s.manual_points} (вручну)` : 'вручну') : `${num(s.points)}/${num(s.max)}`}
                      </td>
                      <td className={`px-4 py-3 font-mono ${s.manual ? 'text-paper-muted' : pctClass(p)}`}>
                        {s.manual || p == null ? '' : `${p}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!hasDetail && (
        <section className="mt-8 rounded-xl border border-gold/30 p-4 text-sm text-paper-muted">
          Для цього результату деталі (відповіді по завданнях і тексти) не збережені в акаунті: його здано до оновлення
          дашборда. Повний розбір цього іспиту є в Notion, в базі «Wyniki — egzamin próbny». Нові іспити зберігаються з
          деталями.
        </section>
      )}

      {hasDetail && (
        <section className="mt-10">
          <h2 className="mb-1 font-display text-xl text-paper">Помилки по завданнях</h2>
          <p className="mb-4 text-xs text-paper-muted">
            Червоне — неправильно або порожньо, золоте — відкрита відповідь для ручної перевірки. Правильні відповіді
            згорнуті під кожним завданням.
          </p>
          <div className="flex flex-col gap-6">
            {sections
              .filter((s) => !s.manual)
              .map((s) => {
                const secTasks = tasks.filter((t) => t.section === s.id);
                if (!secTasks.length) return null;
                return (
                  <div key={s.id}>
                    <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-gold">{s.title}</h3>
                    <div className="flex flex-col gap-3">
                      {secTasks.map((t) => {
                        const bad = t.items.filter((r) => r.status !== 'ok');
                        const good = t.items.filter((r) => r.status === 'ok');
                        const p = t.max ? Math.round((t.points / t.max) * 100) : null;
                        return (
                          <div key={t.id} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                            <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                              <span className="text-paper">
                                {t.title}
                                {t.topic ? <span className="ml-2 text-xs text-paper-muted">{t.topic}</span> : null}
                              </span>
                              <span className={`font-mono ${pctClass(p)}`}>
                                {num(t.points)}/{num(t.max)}
                              </span>
                            </p>
                            {bad.length === 0 ? (
                              <p className="mt-2 text-sm text-correct">Без помилок</p>
                            ) : (
                              <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                                {bad.map((r) => (
                                  <ItemRow key={r.id} r={r} />
                                ))}
                              </ul>
                            )}
                            {good.length > 0 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs text-paper-muted hover:text-gold">
                                  Правильні ({good.length})
                                </summary>
                                <ul className="mt-2 flex flex-col gap-2 text-sm">
                                  {good.map((r) => (
                                    <ItemRow key={r.id} r={r} />
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {(score.weak?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl text-paper">Слабкі теми</h2>
          <div className="flex flex-wrap gap-2">
            {score.weak!.map((w) => (
              <span key={w} className="rounded-lg border border-ink-line bg-ink-raised px-3 py-1.5 text-sm text-paper">
                {w}
              </span>
            ))}
          </div>
        </section>
      )}

      {hasDetail && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl text-paper">Письмові тексти</h2>
          {writing.length === 0 || writing.every((w) => !w.parts.some((p) => p.text)) ? (
            <p className="text-sm text-paper-muted">Учень не написав жодного тексту.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {writing.map((w) =>
                w.parts.some((p) => p.text) ? (
                  <div key={w.task} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                    <p className="mb-3 text-sm text-paper">
                      {w.title}
                      {w.choice ? <span className="ml-2 text-paper-muted">· {w.choice}</span> : null}
                    </p>
                    <div className="flex flex-col gap-4">
                      {w.parts.map((p) => {
                        const off =
                          p.target && p.words ? Math.abs(p.words - p.target) / p.target > 0.1 : false;
                        return (
                          <div key={p.label}>
                            <p className="text-xs text-paper-muted">
                              <span className="text-gold">{p.label}</span> ·{' '}
                              <span className={off ? 'text-incorrect' : 'text-paper'}>{p.words} слів</span>
                              {p.target ? ` · ліміт ${p.target} (±10%)` : ''}
                            </p>
                            <p className="mt-1 border-l-2 border-ink-line pl-3 text-xs italic text-paper-muted">
                              {p.prompt}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-soft p-3 text-sm leading-relaxed text-paper">
                              {p.text || '— (немає тексту)'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
