import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { listPages } from '@/lib/pages/pages';
import { AccessEditor, type ModuleInfo } from '@/components/teacher/AccessEditor';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StudentAccessPage({ params }: { params: { id: string } }) {
  const supabase = await requireTeacher(`/teacher/students/${params.id}`);
  if (!UUID.test(params.id)) notFound();
  const { data: student } = await supabase.from('profiles').select('id, full_name, role').eq('id', params.id).maybeSingle();
  if (!student) notFound();

  const [{ data: grants, error }, { data: done }] = await Promise.all([
    supabase.from('student_access').select('kind, ref').eq('student_id', params.id),
    supabase.from('lesson_progress').select('lesson_slug, completed_at').eq('student_id', params.id),
  ]);

  // курси = модулі з Notion (поле «Код»), лекції в порядку курсу
  const byModule = new Map<string, ModuleInfo>();
  for (const p of listPages()) {
    const code = p.module ?? 'other';
    const m = byModule.get(code) ?? { code, title: p.moduleTitle ?? (p.module ? p.module : 'Без курсу'), lessons: [] };
    m.lessons.push({ slug: p.slug, title: p.title, number: p.number ?? null, level: p.level ?? null });
    byModule.set(code, m);
  }
  const modules = [...byModule.values()].sort((a, b) => a.title.localeCompare(b.title, 'uk'));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/teacher/class" className="text-sm text-paper-muted hover:text-gold">
        ← Усі учні
      </Link>
      <h1 className="mb-1 mt-3 font-display text-3xl text-paper">{student.full_name ?? 'Учень'}</h1>
      <p className="mb-8 text-paper-muted">
        Що бачить учень у «Курсі». Курс відкриває всі його лекції, зокрема майбутні. Лекції, пройдені в класі, відкриваються
        самі.
      </p>
      {error ? (
        <p className="rounded-lg border border-incorrect/40 bg-incorrect/5 p-4 text-incorrect">
          Таблиця доступів ще не створена в базі — потрібна міграція 0013.
        </p>
      ) : (
        <AccessEditor
          studentId={student.id}
          modules={modules}
          initial={(grants ?? []).map((g) => `${g.kind}:${g.ref}`)}
          done={(done ?? []).map((d) => d.lesson_slug as string)}
        />
      )}
    </main>
  );
}
