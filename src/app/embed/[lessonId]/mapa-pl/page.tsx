import { loadTrainer } from '@/lib/trainers';
import { MapaPl, type MapaData } from '@/components/trainers/MapaPl';

type Props = { params: { lessonId: string } };

export default function EmbedMapaPlPage({ params }: Props) {
  return <MapaPl data={loadTrainer<MapaData>(params.lessonId, 'mapa-pl')} />;
}
