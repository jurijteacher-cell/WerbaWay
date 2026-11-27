import { loadTrainer } from '@/lib/trainers';
import { Czytanie, type CzytanieData } from '@/components/trainers/SmallTrainers';

type Props = { params: { lessonId: string } };

export default function EmbedCzytaniePage({ params }: Props) {
  return <Czytanie data={loadTrainer<CzytanieData>(params.lessonId, 'czytanie')} />;
}
