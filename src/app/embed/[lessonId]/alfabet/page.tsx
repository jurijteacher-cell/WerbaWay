import { loadTrainer } from '@/lib/trainers';
import { AlfabetTrainer, type AlfabetData } from '@/components/trainers/AlfabetTrainer';

type Props = { params: { lessonId: string } };

export default function EmbedAlfabetPage({ params }: Props) {
  return <AlfabetTrainer data={loadTrainer<AlfabetData>(params.lessonId, 'alfabet')} />;
}
