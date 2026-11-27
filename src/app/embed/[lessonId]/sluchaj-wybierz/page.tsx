import { loadTrainer } from '@/lib/trainers';
import { SluchajWybierz, type SluchajData } from '@/components/trainers/SmallTrainers';

type Props = { params: { lessonId: string } };

export default function EmbedSluchajWybierzPage({ params }: Props) {
  return <SluchajWybierz data={loadTrainer<SluchajData>(params.lessonId, 'sluchaj-wybierz')} />;
}
