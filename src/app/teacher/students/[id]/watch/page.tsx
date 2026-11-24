import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { LiveWatch } from '@/components/live/LiveWatch';
import { classTopic } from '@/lib/live/protocol';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** «Дивитися» — відповіді учня у вправах наживо; лекцією гортає викладач сам. id = акаунт учня (profiles.id). */
export default async function WatchStudentPage({ params, searchParams }: { params: { id: string }; searchParams: { dock?: string } }) {
  const supabase = await requireTeacher(`/teacher/students/${params.id}/watch`);
  if (!UUID.test(params.id)) notFound();
  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', params.id).maybeSingle();
  if (!profile || profile.role === 'teacher') notFound();
  const name = (profile.full_name as string) || t('Учень');

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href={`/teacher/students/${params.id}`} className="text-sm text-paper-muted hover:text-gold">
          {t('← {name}', { name })}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t('Відповіді учня: {name}', { name })}</h1>
        <p className="text-sm text-paper-muted">{t('Учень бачить позначку «Викладач бачить твої відповіді». Ти бачиш, що він обирає й вписує у вправах; лекцію гортаєш сам — в учня нічого не змінюється.')}</p>
      </div>
      <LiveWatch topic={classTopic(params.id)} studentId={params.id} name={name} />
    </main>
  );
}
