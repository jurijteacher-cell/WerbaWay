import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '../requireTeacher';
import { fmt, pct, pctClass } from '../format';
import { lessonTitle } from '@/lib/lesson-titles';
import { ArchiveButton, DeleteLessonButton } from './StudentActions';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Attempt = {
  lesson_id: string;
  embed: string;
  block_id: string | null;
  item_id: string;
  item_type: string | null;
  grammar_point: string | null;
  prompt: string | null;
  answer: string | null;
  expected: string | null;
  is_correct: boolean | null;
  attempt_no: number;
  created_at: string;
};

type ItemSummary = {
  id: string;
  type: string | null;
  grammarPoint: string | null;
  prompt: string | null;
  expected: string | null;
  open: boolean;
  firstOk: boolean | null;
  solved: boolean;
  wrong: string[];
  lastAnswer: string | null;
  lastAt: string;
  versions: number;
};

type ExamRow = {
  id: string;
  exam_label: string | null;
  lesson_id: string;
  total: number;
  max_total: number;
  level: string | null;
  passed: boolean | null;
  created_at: string;
};

const EMBED_LABEL: Record<string, string> = {
  grammar: 'Gramatyka',
  hw: 'Praca domowa',
  exam: 'Egzamin',
  'grammar-board': 'Tablica',
};
const EMBED_ORDER = ['grammar', 'grammar-board', 'hw', 'exam'];

function summarize(attempts: Attempt[]) {
  const lessons = new Map<
    string,
    { firstAt: string; lastAt: string; embeds: Map<string, Map<string, Map<string, ItemSummary>>> }
  >();
  for (const a of attempts) {
    let L = lessons.get(a.lesson_id);
    if (!L) {
      L = { firstAt: a.created_at, lastAt: a.created_at, embeds: new Map() };
      lessons.set(a.lesson_id, L);
    }
    L.lastAt = a.created_at;
    let E = L.embeds.get(a.embed);
    if (!E) L.embeds.set(a.embed, (E = new Map()));
    const blockKey = a.block_id ?? '—';
    let B = E.get(blockKey);
    if (!B) E.set(blockKey, (B = new Map()));
    let it = B.get(a.item_id);
    if (!it) {
      it = {
        id: a.item_id,
        type: a.item_type,
        grammarPoint: a.grammar_point,
        prompt: a.prompt,
        expected: a.expected,
        open: a.is_correct === null,
        firstOk: a.is_correct,
        solved: false,
        wrong: [],
        lastAnswer: null,
        lastAt: a.created_at,
        versions: 0,
      };
      B.set(a.item_id, it);
    }
    it.versions++;
    it.lastAnswer = a.answer;
    it.lastAt = a.created_at;
    if (a.is_correct === true) it.solved = true;
    if (a.is_correct === false && !it.solved && a.answer) it.wrong.push(a.answer);
  }
  return lessons;
}

function weakPoints(attempts: Attempt[]) {
  const m = new Map<string, { ok: number; total: number }>();
  for (const a of attempts) {
    if (a.attempt_no !== 1 || a.is_correct === null || !a.grammar_point) continue;
    const s = m.get(a.grammar_point) ?? { ok: 0, total: 0 };
    s.total++;
    if (a.is_correct) s.ok++;
    m.set(a.grammar_point, s);
  }
  return Array.from(m.entries())
    .map(([tag, s]) => ({ tag, ...s, p: pct(s.ok, s.total)! }))
    .filter((x) => x.total >= 3)
    .sort((a, b) => a.p - b.p || b.total - a.total);
}

export default async function StudentResultsPage({ params }: { params: { studentId: string } }) {
  const supabase = await requireTeacher();

  const { data: student } = await supabase
    .from('embed_student_stats')
    .select('*')
    .eq('id', params.studentId)
    .maybeSingle();
  if (!student) notFound();

  const { data, error } = await supabase
    .from('embed_attempts')
    .select(
      'lesson_id, embed, block_id, item_id, item_type, grammar_point, prompt, answer, expected, is_correct, attempt_no, created_at'
    )
    .eq('student_id', params.studentId)
    .order('created_at', { ascending: true })
    .limit(5000);

  const { data: examRows } = student.user_id
    ? await supabase
        .from('mock_results')
        .select('id, exam_label, lesson_id, total, max_total, level, passed, created_at')
        .eq('user_id', student.user_id)
        .order('created_at', { ascending: false })
    : { data: [] as ExamRow[] };
  const exams = (examRows ?? []) as ExamRow[];

  const attempts = (data ?? []) as Attempt[];
  const lessons = Array.from(summarize(attempts).entries()).sort((a, b) =>
    b[1].lastAt.localeCompare(a[1].lastAt)
  );
  const weak = weakPoints(attempts);
  const overall = pct(student.first_ok, student.first_total);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="mb-2 text-sm">
        <Link href="/teacher/results" className="text-paper-muted hover:text-gold">
          ← Усі учні
        </Link>
      </p>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-paper">{student.name}</h1>
          <p className="mt-1 text-sm text-paper-muted">
            {student.user_id ? t("Акаунт") : student.code ? <>{t("Код")} <span className="font-mono text-gold">{student.code}</span></> : '—'}
            {student.note ? ` · ${student.note}` : ''}
            {student.archived_at ? t(" · в архіві") : ''}
          </p>
        </div>
        <ArchiveButton studentId={student.id} archived={Boolean(student.archived_at)} />
      </div>

      {error && <p className="mb-6 text-incorrect">Помилка: {error.message}</p>}

      <section className="mb-10 grid gap-3 sm:grid-cols-4">
        {[
          { label: t("Уроків"), value: String(student.lessons) },
          {
            label: t("З першої спроби"),
            value: overall == null ? '—' : `${overall}%`,
            cls: pctClass(overall),
          },
          { label: t("Завдань перевірено"), value: String(student.first_total) },
          { label: t("Письмових відповідей"), value: String(student.open_answers) },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-ink-line bg-ink-raised p-4">
            <p className="text-xs text-paper-muted">{c.label}</p>
            <p className={`mt-1 font-mono text-2xl ${c.cls ?? 'text-paper'}`}>{c.value}</p>
          </div>
        ))}
      </section>

      {weak.some((w) => w.p < 80) && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl text-paper">{t("Слабкі місця")}</h2>
          <p className="mb-3 text-xs text-paper-muted">
            Теги граматики, де з першої спроби менше 80% (щонайменше 3 завдання).
          </p>
          <div className="flex flex-wrap gap-2">
            {weak
              .filter((w) => w.p < 80)
              .slice(0, 12)
              .map((w) => (
                <span key={w.tag} className="rounded-lg border border-ink-line bg-ink-raised px-3 py-1.5 text-sm">
                  <span className="text-paper">{w.tag}</span>{' '}
                  <span className={`font-mono ${pctClass(w.p)}`}>{w.p}%</span>{' '}
                  <span className="text-xs text-paper-muted">
                    ({w.ok}/{w.total})
                  </span>
                </span>
              ))}
          </div>
        </section>
      )}

      {exams.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl text-paper">{t("Пробні іспити")}</h2>
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <tbody>
                {exams.map((m) => (
                  <tr key={m.id} className="border-t border-ink-line first:border-t-0">
                    <td className="px-4 py-3 text-paper">{m.exam_label ?? m.lesson_id}</td>
                    <td className="px-4 py-3 font-mono text-paper">
                      {m.total}/{m.max_total}
                    </td>
                    <td className={`px-4 py-3 ${m.passed ? 'text-correct' : 'text-incorrect'}`}>
                      {m.level ?? (m.passed ? 'zdane' : 'poniżej progu')}
                    </td>
                    <td className="px-4 py-3 text-paper-muted">{fmt(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/teacher/exams/${m.id}`} className="text-gold hover:underline">
                        Помилки й тексти →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl text-paper">{t("Уроки")}</h2>
        {lessons.length === 0 && (
          <p className="text-sm text-paper-muted">
            Ще немає жодної спроби. Учень має увійти в акаунт над вправами в Notion.
          </p>
        )}
        <div className="flex flex-col gap-4">
          {lessons.map(([lessonId, L], li) => {
            const embeds = Array.from(L.embeds.entries()).sort(
              (a, b) => EMBED_ORDER.indexOf(a[0]) - EMBED_ORDER.indexOf(b[0])
            );
            let lOk = 0;
            let lTotal = 0;
            embeds.forEach(([, blocks]) =>
              blocks.forEach((items) =>
                items.forEach((it) => {
                  if (it.open) return;
                  lTotal++;
                  if (it.firstOk) lOk++;
                })
              )
            );
            const lp = pct(lOk, lTotal);
            return (
              <details
                key={lessonId}
                open={li === 0}
                className="rounded-xl border border-ink-line bg-ink-raised [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 px-5 py-4">
                  <span>
                    <span className="text-paper">{lessonTitle(lessonId)}</span>
                    <span className="ml-2 font-mono text-xs text-paper-muted">{lessonId}</span>
                  </span>
                  <span className="text-sm">
                    <span className={`font-mono ${pctClass(lp)}`}>{lp == null ? '—' : `${lp}%`}</span>
                    <span className="ml-3 text-paper-muted">{fmt(L.lastAt)}</span>
                  </span>
                </summary>

                <div className="border-t border-ink-line px-5 py-4">
                  {embeds.map(([embed, blocks]) => (
                    <div key={embed} className="mb-6 last:mb-2">
                      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-gold">
                        {EMBED_LABEL[embed] ?? embed}
                      </h3>
                      <div className="flex flex-col gap-3">
                        {Array.from(blocks.entries()).map(([blockId, items]) => {
                          const list = Array.from(items.values());
                          const scored = list.filter((i) => !i.open);
                          const ok = scored.filter((i) => i.firstOk).length;
                          const bp = pct(ok, scored.length);
                          const mistakes = scored.filter((i) => !i.firstOk);
                          const open = list.filter((i) => i.open);
                          return (
                            <div key={blockId} className="rounded-lg bg-ink-soft p-3">
                              <p className="text-sm">
                                <span className="font-mono text-paper">{blockId}</span>
                                {scored.length ? (
                                  <>
                                    <span className={`ml-3 font-mono ${pctClass(bp)}`}>{bp}%</span>
                                    <span className="ml-1 text-xs text-paper-muted">
                                      ({ok}/{scored.length} з першої спроби)
                                    </span>
                                  </>
                                ) : null}
                              </p>

                              {mistakes.length > 0 && (
                                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                                  {mistakes.map((m) => (
                                    <li key={m.id} className="border-l-2 border-incorrect/60 pl-3">
                                      {m.prompt ? <p className="text-paper-muted">{m.prompt}</p> : null}
                                      <p>
                                        <span className="text-incorrect line-through decoration-1">
                                          {m.wrong.length ? m.wrong.join(' · ') : '—'}
                                        </span>
                                        <span className="mx-2 text-paper-muted">→</span>
                                        <span className="text-correct">{m.expected}</span>
                                        <span className="ml-2 text-xs text-paper-muted">
                                          {m.solved ? t('виправив(ла) з {n}-ї спроби', { n: m.versions }) : t("не розв’язано")}
                                        </span>
                                        {m.grammarPoint ? (
                                          <span className="ml-2 font-mono text-[11px] text-paper-muted">
                                            {m.grammarPoint}
                                          </span>
                                        ) : null}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {open.map((o) => (
                                <div key={o.id} className="mt-3 rounded-lg border border-gold/30 p-3">
                                  {o.prompt ? <p className="mb-1 text-xs text-paper-muted">{o.prompt}</p> : null}
                                  <p className="whitespace-pre-wrap text-sm text-paper">{o.lastAnswer}</p>
                                  <p className="mt-1 text-xs text-paper-muted">
                                    {fmt(o.lastAt)}
                                    {o.versions > 1 ? ` · ${t('версія {n}', { n: o.versions })}` : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <DeleteLessonButton studentId={student.id} lessonId={lessonId} />
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
