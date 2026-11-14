import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchAttempts, fmtDate, pctClass, summarize, type MockRow } from '@/lib/analytics';
import { listPages } from '@/lib/pages/pages';
import { getLocale, t } from '@/i18n/server';
import { loadDeck } from '@/lib/words';
import { lectureStats } from '@/lib/lecture-stats';
import { LectureCard } from '@/components/dashboard/LectureCard';
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
  const progressBySlug = new Map((progressRows ?? []).map((r) => [r.lesson_slug as string, r]));
  // Картка лекції — для кожного уроку курсу, де є запис про проходження або хоч одна відповідь
  const allPages = listPages(getLocale());
  const lectureCards = allPages
    .map((p) => ({ page: p, stats: lectureStats(p.slug, attempts), row: progressBySlug.get(p.slug) }))
    .filter((x) => x.row || x.stats.touched)
    .sort((a, b) => ((b.row?.completed_at as string) ?? b.stats.lastAt ?? '').localeCompare((a.row?.completed_at as string) ?? a.stats.lastAt ?? ''));
  const history = (progressRows ?? []).map((r) => ({
    ...r,
    title: allPages.find((p) => p.slug === r.lesson_slug)?.title ?? (r.lesson_slug as string),
  }));
  // Слова: колоди з пройдених лекцій і скільки вже запам'ятано
  const { data: vpRows } = await supabase.from('vocab_progress').select('lesson_slug, known').eq('student_id', user.id);
  const wordDecks = (progressRows ?? [])
    .map((r) => loadDeck(r.lesson_slug as string))
    .filter((d): d is NonNullable<typeof d> => !!d && d.words.length > 0);
  const wordsTotal = wordDecks.reduce((n, d) => n + d.words.length, 0);
  const wordsKnown = (vpRows ?? []).filter((r) => r.known && wordDecks.some((d) => d.slug === r.lesson_slug)).length;
  const homeworkTodo = history.filter((h) => h.homework_assigned_at && !h.homework_done_at);

  const s = summarize(attempts);
  const isTeacher = profile?.role === 'teacher';
  const name = profile?.full_name || user.email;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ww-label">{t("Мій прогрес")}</p>
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
        <Section title={t('Домашка ({n})', { n: homeworkTodo.length })}>
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

      {wordDecks.length > 0 && (
        <Section title={t("Слова")}>
          <Link
            href="/words"
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-line bg-ink-raised px-5 py-4 transition-colors hover:border-gold"
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-paper">
                {wordDecks.length} {wordDecks.length === 1 ? t("колода") : t("колод")} · {wordsTotal} слів
              </p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-line/70">
                <div className="h-full rounded-full bg-gold-solid" style={{ width: `${wordsTotal ? Math.round((wordsKnown / wordsTotal) * 100) : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-paper-muted">
                запам’ятано {wordsKnown} з {wordsTotal}
              </p>
            </div>
            <span className="ww-btn ww-btn-primary">{t("Тренувати →")}</span>
          </Link>
        </Section>
      )}

      {lectureCards.length > 0 && (
        <Section title={t("Мої лекції")}>
          <div className="grid gap-4 md:grid-cols-2">
            {lectureCards.map(({ page, stats, row }) => (
              <LectureCard
                key={page.slug}
                slug={page.slug}
                title={page.title}
                level={page.level}
                icon={page.icon}
                cover={page.cover}
                stats={stats}
                completedAt={(row?.completed_at as string) ?? null}
                homework={row ? { assigned: !!row.homework_assigned_at, done: !!row.homework_done_at } : null}
                fmt={fmtDate}
              />
            ))}
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
              label={t("З першої спроби")}
              value={s.accuracy == null ? '—' : `${s.accuracy}%`}
              tone={pctClass(s.accuracy)}
              hint={t('{ok} з {total}', { ok: s.firstOk, total: s.firstTotal })}
            />
            <Kpi label={t("Вправ")} value={s.exercises} hint={t('{n} перевірок', { n: s.attempts })} />
            <Kpi label={t("Уроків")} value={s.lessons} />
            <Kpi label={t("Серія днів")} value={s.streak} hint={t('активних днів: {n}', { n: s.activeDays })} />
          </div>

          <Section title={t("Активність (28 днів)")}>
            <div className="rounded-xl border border-ink-line bg-ink-raised p-4">
              <Activity daily={s.daily} />
            </div>
          </Section>

          <div className="grid gap-8 [&>*]:min-w-0 md:grid-cols-2">
            <Section title={t("Слабкі теми")}>
              <WeakList weak={s.weak} />
            </Section>
            <Section title={t("За типом вправ")}>
              <EmbedBreakdown byEmbed={s.byEmbed} />
            </Section>
          </div>

          <Section title={t("Останні уроки")}>
            <div className="overflow-x-auto rounded-xl border border-ink-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-raised text-paper-muted">
                  <tr>
                    <th className="px-4 py-3 font-normal">{t("Урок")}</th>
                    <th className="px-4 py-3 font-normal">{t("Спроб")}</th>
                    <th className="px-4 py-3 font-normal">{t("З першої")}</th>
                    <th className="px-4 py-3 font-normal">{t("Коли")}</th>
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
        <Section title={t("Пробні іспити")}>
          <div className="overflow-x-auto rounded-xl border border-ink-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-raised text-paper-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">{t("Іспит")}</th>
                  <th className="px-4 py-3 font-normal">{t("Бали")}</th>
                  <th className="px-4 py-3 font-normal">{t("Результат")}</th>
                  <th className="px-4 py-3 font-normal">{t("Хв")}</th>
                  <th className="px-4 py-3 font-normal">{t("Коли")}</th>
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
