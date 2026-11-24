import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { LiveWatch } from '@/components/live/LiveWatch';
import { classTopic } from '@/lib/live/protocol';
import { t } from '@/i18n/server';
import { InfoSticker } from '@/components/ui/InfoSticker';

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
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/teacher/students/${params.id}`} className="text-sm text-paper-muted hover:text-gold">
          {t('← {name}', { name })}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t('Відповіді учня: {name}', { name })}</h1>
        <InfoSticker
          icon="eye"
          label={t('Що бачить учень і що бачиш ти')}
          title={t('Як працює «Дивитися»')}
          items={[
            t('Учень бачить стікер «Викладач бачить твої відповіді».'),
            t('Ти бачиш, що він обирає й вписує у вправах.'),
            t('Лекцією гортаєш сам — в учня нічого не змінюється.'),
          ]}
        />
      </div>
      <LiveWatch topic={classTopic(params.id)} studentId={params.id} name={name} />
    </main>
  );
}
