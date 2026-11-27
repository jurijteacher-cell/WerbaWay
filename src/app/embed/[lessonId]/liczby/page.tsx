import { loadTrainer } from '@/lib/trainers';
import { Liczby, type LiczbyData } from '@/components/trainers/SmallTrainers';

type Props = { params: { lessonId: string } };

export default function EmbedLiczbyPage({ params }: Props) {
  return <Liczby data={loadTrainer<LiczbyData>(params.lessonId, 'liczby')} />;
}
