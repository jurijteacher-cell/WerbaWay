import { loadTrainer } from '@/lib/trainers';
import { CzytajGlosno, type CzytajData } from '@/components/trainers/SmallTrainers';

type Props = { params: { lessonId: string } };

export default function EmbedCzytajGlosnoPage({ params }: Props) {
  return <CzytajGlosno data={loadTrainer<CzytajData>(params.lessonId, 'czytaj-glosno')} />;
}
