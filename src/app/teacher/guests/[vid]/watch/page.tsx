import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { LiveWatch } from '@/components/live/LiveWatch';
import { guestTopic } from '@/lib/live/protocol';
import { guestLabel } from '@/lib/guest';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * «Дивитися» гостя за публічним посиланням: vid — кука ww_vid його браузера.
 * Акаунта в нього немає, тому ні «Пройдено», ні сторінки учня тут не буває.
 */
export default async function WatchGuestPage({ params }: { params: { vid: string } }) {
  const supabase = await requireTeacher(`/teacher/guests/${params.vid}/watch`);
  if (!UUID.test(params.vid)) notFound();
  const { data: guest } = await supabase
    .from('guest_visitor_stats')
    .select('id, num, ua, last_seen, claimed_by')
    .eq('id', params.vid)
    .maybeSingle();
  if (!guest) notFound();
  const name = guestLabel(guest.num as number);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link href="/teacher/students" className="text-sm text-paper-muted hover:text-gold">
          {t("← Учні")}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t('Відповіді гостя: {name}', { name })}</h1>
        <p className="text-sm text-paper-muted">
          {guest.ua ? `${guest.ua} · ` : ''}
          {t('Гість бачить позначку «Викладач бачить твої відповіді». Ти бачиш, що він обирає й вписує у вправах; лекцію гортаєш сам — у гостя нічого не змінюється.')}
        </p>
      </div>
      <LiveWatch topic={guestTopic(params.vid)} name={name} />
    </main>
  );
}
