import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { fetchAttempts, fmtDate, summarize, type AttemptRow, type MockRow } from '@/lib/analytics';
import { groupByCourse, listPages } from '@/lib/pages/pages';
import { lectureStats } from '@/lib/lecture-stats';
import { loadDeck } from '@/lib/words';
import { avatarColor, initials, relDay } from '@/lib/students';
import { LectureCard } from '@/components/dashboard/LectureCard';
import { Activity, Section, WeakList } from '@/components/dashboard/parts';
import { AccessEditor, type ModuleInfo } from '@/components/teacher/AccessEditor';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Tile({ value, label, tone }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-raised px-4 py-3 shadow-[0_1px_0_#e6ebf8]">
      <p className={`font-display text-3xl leading-none ${tone ?? 'text-paper'}`}>{value}</p>
      <p className="mt-1.5 text-sm text-paper-muted">{label}</p>
    </div>
  );
}

/** Профіль учня: прогрес, лекції, пройдені разом, слова, пробні іспити, доступ. id = акаунт або embed-учень (лише Notion). */
export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const supabase = await requireTeacher(`/teacher/students/${params.id}`);
  if (!UUID.test(params.id)) notFound();

  const [{ data: profile }, { data: embedRows }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('id', params.id).maybeSingle(),
    supabase.from('embed_student_stats').select('id, name, user_id').or(`id.eq.${params.id},user_id.eq.${params.id}`),
  ]);
  const userId = (profile?.id as string | undefined) ?? ((embedRows ?? []).find((e) => e.user_id)?.user_id as string | undefined) ?? null;
  const embeds = (embedRows ?? []).filter((e) => e.id === params.id || (userId && e.user_id === userId));
  if (!profile && !embeds.length) notFound();
  const name = (profile?.full_name as string) || (embeds[0]?.name as string) || t("Учень");

  const embedIds = embeds.map((e) => e.id as string);
  const attempts: AttemptRow[] = (
    await Promise.all(embedIds.map((id) => fetchAttempts(supabase, { studentId: id })))
  ).flat();

  const [{ data: progress }, { data: grants }, { data: vocab }, { data: mocks }, { data: room }] = await Promise.all([
    userId
      ? supabase.from('lesson_progress').select('lesson_slug, completed_at, homework_assigned_at, homework_done_at').eq('student_id', userId).order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    userId ? supabase.from('student_access').select('kind, ref').eq('student_id', userId) : Promise.resolve({ data: [] as never[] }),
    userId ? supabase.from('vocab_progress').select('lesson_slug, known').eq('student_id', userId) : Promise.resolve({ data: [] as never[] }),
    userId
      ? supabase.from('mock_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as never[] }),
    userId ? supabase.from('class_rooms').select('active, lesson_id, updated_at').eq('student_id', userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const s = summarize(attempts);
  const pages = listPages();
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  const done = progress ?? [];
  const doneSet = new Set(done.map((r) => r.lesson_slug as string));

  // пройдені в класі — у порядку від свіжих; «займався сам» — лекції з відповідями без проходження в класі
  const together = done
    .map((r) => ({ row: r, page: pageBySlug.get(r.lesson_slug as string) }))
    .filter((x) => x.page);
  const solo = pages
    .filter((p) => !doneSet.has(p.slug))
    .map((p) => ({ page: p, stats: lectureStats(p.slug, attempts) }))
    .filter((x) => x.stats.touched)
    .sort((a, b) => (b.stats.lastAt ?? '').localeCompare(a.stats.lastAt ?? ''));

  const decks = done.map((r) => loadDeck(r.lesson_slug as string)).filter((d): d is NonNullable<typeof d> => !!d && d.words.length > 0);
  const wordsTotal = decks.reduce((n, d) => n + d.words.length, 0);
  const wordsKnown = (vocab ?? []).filter((v) => v.known && decks.some((d) => d.slug === v.lesson_slug)).length;
  const hwTodo = done.filter((r) => r.homework_assigned_at && !r.homework_done_at).length;
  const hwDone = done.filter((r) => r.homework_done_at).length;
  const lastAt = [s.lastAt, done[0]?.completed_at as string | undefined].filter(Boolean).sort().pop() ?? null;

  // курси для перемикачів доступу: де більше лекцій — вище
  const modules: ModuleInfo[] = groupByCourse(pages).map((g) => ({
    code: g.code || 'other',
    title: g.title,
    lessons: g.pages.map((p) => ({ slug: p.slug, title: p.title, number: p.number ?? null, level: p.level ?? null })),
  }));
  const byModule = new Map(modules.map((m) => [m.code, m]));
  const courseTitles = (grants ?? [])
    .filter((g) => g.kind === 'module')
    .map((g) => byModule.get(g.ref as string)?.title ?? (g.ref as string));

  const acc = s.accuracy;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/teacher/students" className="text-sm text-paper-muted hover:text-gold">
        ← Учні
      </Link>

      {/* шапка профілю */}
      <header className="mt-4 flex flex-wrap items-center gap-5 rounded-3xl border border-ink-line bg-ink-raised p-5 shadow-[0_1px_0_#e6ebf8]">
        <span
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-bold text-paper shadow-sm"
          style={{ background: avatarColor(name) }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl text-paper">{name}</h1>
          <p className="mt-1 text-sm text-paper-muted">
            Остання активність: <b className="text-paper">{relDay(lastAt)}</b>
            {room?.active && <span className="ml-2 rounded-full bg-correct/10 px-2 py-0.5 text-correct">{t("зараз у класі")}</span>}
            {!userId && <span className="ml-2 rounded bg-ink-soft px-1.5 py-0.5">{t("лише Notion, без акаунта")}</span>}
          </p>
          {courseTitles.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5">
              {courseTitles.map((t) => (
                <span key={t} className="rounded-full border border-ink-line bg-ink px-2.5 py-0.5 text-xs text-paper">
                  {t}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {userId && (
            <Link href={`/teacher/class/${userId}`} className="ww-btn ww-btn-primary">
              Заняття з учнем
            </Link>
          )}
          {embedIds[0] && (
            <Link href={`/teacher/results/${embedIds[0]}`} className="ww-btn ww-btn-secondary">
              Усі відповіді у вправах
            </Link>
          )}
        </div>
      </header>

      {/* підсумки */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile value={userId ? done.length : '—'} label={t("лекцій разом")} />
        <Tile
          value={acc == null ? '—' : `${acc}%`}
          label={t("оцінка")}
          tone={acc == null ? undefined : acc >= 80 ? 'text-correct' : acc >= 60 ? 'text-gold' : 'text-incorrect'}
        />
        <Tile value={s.attempts} label={t("відповідей")} />
        <Tile value={s.activeDays} label={t("активних днів")} />
        <Tile value={userId ? `${wordsKnown}/${wordsTotal}` : '—'} label={t("слів запам’ятав")} />
        <Tile value={userId ? `${hwDone}/${hwDone + hwTodo}` : '—'} label={t("домашок здано")} tone={hwTodo ? 'text-gold' : undefined} />
      </div>

      <div className="mt-10 grid gap-8 [&>*]:min-w-0 lg:grid-cols-2">
        <Section title={t("Активність (28 днів)")}>
          <Activity daily={s.daily} />
        </Section>
        <Section title={t("Слабкі теми")}>
          {s.weak.length ? <WeakList weak={s.weak} /> : <p className="text-paper-muted">{t("Поки замало відповідей, щоб бачити слабкі теми.")}</p>}
        </Section>
      </div>

      {userId && (
        <div className="mt-10">
          <Section title={`Лекції, пройдені разом (${together.length})`}>
            {together.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {together.map(({ row, page }) => (
                  <LectureCard
                    key={page!.slug}
                    slug={page!.slug}
                    title={page!.title}
                    level={page!.level}
                    icon={page!.icon}
                    cover={page!.cover}
                    stats={lectureStats(page!.slug, attempts)}
                    completedAt={row.completed_at as string}
                    homework={{ assigned: !!row.homework_assigned_at, done: !!row.homework_done_at }}
                    fmt={fmtDate}
                  />
                ))}
              </div>
            ) : (
              <p className="text-paper-muted">
                Ще жодної. Лекція з’явиться тут, коли в класі натиснеш «Завершити лекцію».
              </p>
            )}
          </Section>
        </div>
      )}

      {solo.length > 0 && (
        <div className="mt-10">
          <Section title={`Займався сам (${solo.length})`}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {solo.map(({ page, stats }) => (
                <LectureCard
                  key={page.slug}
                  slug={page.slug}
                  title={page.title}
                  level={page.level}
                  icon={page.icon}
                  cover={page.cover}
                  stats={stats}
                  completedAt={null}
                  homework={null}
                  fmt={fmtDate}
                />
              ))}
            </div>
          </Section>
        </div>
      )}

      {s.recentLessons.length > 0 && (
        <div className="mt-10">
          <Section title={t("Останні вправи")}>
            <ul className="divide-y divide-ink-line overflow-hidden rounded-2xl border border-ink-line bg-ink-raised">
              {s.recentLessons.slice(0, 8).map((l) => (
                <li key={l.lessonId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-paper">{pageBySlug.get(l.lessonId)?.title ?? l.title}</span>
                  <span className="text-paper-muted">{l.attempts} відп.</span>
                  <span className={`w-12 text-right font-semibold ${l.pct == null ? 'text-paper-muted' : l.pct >= 80 ? 'text-correct' : l.pct >= 60 ? 'text-gold' : 'text-incorrect'}`}>
                    {l.pct == null ? '—' : `${l.pct}%`}
                  </span>
                  <span className="w-24 text-right text-paper-muted">{fmtDate(l.lastAt)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {(mocks ?? []).length > 0 && (
        <div className="mt-10">
          <Section title={t("Пробні іспити")}>
            <ul className="divide-y divide-ink-line overflow-hidden rounded-2xl border border-ink-line bg-ink-raised">
              {((mocks ?? []) as MockRow[]).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-paper">{m.exam_label ?? m.lesson_id}</span>
                  <span className="font-semibold text-paper">
                    {m.total}/{m.max_total}
                  </span>
                  <span className={m.passed ? 'text-correct' : 'text-incorrect'}>{m.passed ? t("склав") : t("не склав")}</span>
                  <span className="w-24 text-right text-paper-muted">{fmtDate(m.created_at)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {userId && (
        <div className="mt-12" id="access">
          <Section title={t("Доступ до лекцій")}>
            <p className="mb-4 text-sm text-paper-muted">
              Що учень бачить у «Курсі». Курс відкриває всі його лекції, зокрема майбутні. Лекції, пройдені в класі, відкриваються самі.
            </p>
            <AccessEditor
              studentId={userId}
              modules={modules}
              initial={(grants ?? []).map((g) => `${g.kind}:${g.ref}`)}
              done={done.map((d) => d.lesson_slug as string)}
            />
          </Section>
        </div>
      )}
    </main>
  );
}
