import { loadTrainer } from '@/lib/trainers';
import { Dialogi, type DialogiData } from '@/components/trainers/SmallTrainers';

type Props = { params: { lessonId: string } };

export default function EmbedDialogiPage({ params }: Props) {
  return <Dialogi data={loadTrainer<DialogiData>(params.lessonId, 'dialogi')} />;
}
