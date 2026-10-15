import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { GrammarSlides, type GrammarSlide } from '@/components/exercises/GrammarSlides';
import { NotebookShell } from '@/components/exercises/NotebookShell';
import '@/components/exercises/notebook.css';

type Props = {
  params: { lessonId: string };
  searchParams?: { part?: string; teacher?: string };
};

function loadSlides(lessonId: string, teacher: boolean) {
  const publicTeacher = path.join(process.cwd(), 'public/slides', `${lessonId}.teacher.json`);
  const publicStudent = path.join(process.cwd(), 'public/slides', `${lessonId}.json`);
  const queueDirs = [
    path.join(process.cwd(), 'content-queue/lectures/pending', lessonId),
    path.join(process.cwd(), 'content-queue/lectures/published', lessonId),
    path.join(process.cwd(), 'src/content/queue-published'),
  ];

  if (teacher && existsSync(publicTeacher)) {
    return JSON.parse(readFileSync(publicTeacher, 'utf8'));
  }
  if (existsSync(publicStudent)) {
    return JSON.parse(readFileSync(publicStudent, 'utf8'));
  }
  for (const dir of queueDirs) {
    const p = path.join(dir, dir.endsWith('queue-published') ? `${lessonId}-slides.json` : `${lessonId}-slides.json`);
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  return null;
}

export default function SlidesPage({ params, searchParams }: Props) {
  const teacher = searchParams?.teacher === '1';
  const raw = loadSlides(params.lessonId, teacher);
  if (!raw) notFound();

  const partRaw = searchParams?.part;
  const part = partRaw != null && partRaw !== '' ? Number(partRaw) : undefined;

  let slides: GrammarSlide[] = raw.slides ?? [];
  if (!teacher) {
    slides = slides.map(({ teacher_note: _t, ...rest }: GrammarSlide & { teacher_note?: string }) => rest);
  }

  return (
    <main style={{ background: '#E7E2D7', minHeight: '100vh' }}>
      <NotebookShell levelHint="gramatyka · prezentacja">
        <GrammarSlides
          title={raw.title ?? 'Slajdy'}
          slides={slides}
          part={Number.isFinite(part) ? part : undefined}
          teacherMode={teacher}
        />
      </NotebookShell>
    </main>
  );
}
