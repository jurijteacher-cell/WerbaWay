import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { loadStudents } from '@/lib/students';
import { StudentsGrid } from '@/components/students/StudentsGrid';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

function Tile({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-raised px-4 py-3 shadow-[0_1px_0_#e6ebf8]">
      <p className="font-display text-3xl leading-none text-paper">{value}</p>
      <p className="mt-1.5 text-sm text-paper-muted">{label}</p>
      {hint && <p className="text-xs text-paper-muted/80">{hint}</p>}
    </div>
  );
}

export default async function StudentsPage() {
  const supabase = await requireTeacher('/teacher/students');
  const { rows } = await loadStudents(supabase);

  const active = rows.filter((r) => r.activeDays7 > 0).length;
  const lectures = rows.reduce((n, r) => n + r.lecturesDone, 0);
  const hw = rows.reduce((n, r) => n + r.homeworkTodo, 0);
  const firstTotal = rows.reduce((n, r) => n + r.firstTotal, 0);
  const avg = firstTotal ? Math.round(rows.reduce((n, r) => n + (r.accuracy ?? 0) * r.firstTotal, 0) / firstTotal) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-1 font-display text-4xl text-paper">{t("Учні")}</h1>
      <p className="mb-8 text-paper-muted">{t("Хто як займається. Відкрий учня, щоб побачити прогрес, пройдені з ним лекції й доступи.")}</p>

      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile value={rows.length} label={t("учнів")} hint={`${rows.filter((r) => r.hasAccount).length} з акаунтом`} />
        <Tile value={active} label={t("активні за тиждень")} />
        <Tile value={lectures} label={t("лекцій пройдено в класі")} />
        <Tile value={hw} label={t("домашок чекає")} />
        <Tile value={avg == null ? '—' : `${avg}%`} label={t("середня оцінка")} hint={t("правильно з першої спроби")} />
      </div>

      <StudentsGrid rows={rows} />
    </main>
  );
}
