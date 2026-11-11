import { requireTeacher } from '../results/requireTeacher';
import { ClassRoster } from '@/components/class/ClassRoster';

export const dynamic = 'force-dynamic';

export default async function TeacherClassIndex() {
  const supabase = await requireTeacher('/teacher/class');
  const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
  const students = (data ?? []).map((p) => ({ id: p.id as string, name: (p.full_name as string | null) || 'Без імені' }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 font-display text-3xl text-paper">Клас</h1>
      <p className="mb-8 text-paper-muted">Хто зараз онлайн. Натисніть на учня, щоб відкрити його клас.</p>
      <ClassRoster students={students} />
    </main>
  );
}
