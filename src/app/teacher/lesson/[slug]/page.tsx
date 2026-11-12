import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { loadPage, loadTeacherPage } from '@/lib/pages/pages';
import { TeacherNotes } from '@/components/lesson/TeacherNotes';

export const dynamic = 'force-dynamic';

export default async function TeacherLessonPage({ params }: { params: { slug: string } }) {
  await requireTeacher();
  const notes = loadTeacherPage(params.slug);
  if (!notes) notFound();
  const lesson = loadPage(params.slug);
  return <TeacherNotes page={notes} lessonSlug={params.slug} lessonTitle={lesson?.meta.title} />;
}
