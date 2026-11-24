/**
 * Фото до письмових відповідей. Відповідь у embed_attempts.answer — звичайний текст; фото
 * дописуються в кінець маркерами `[[foto:<шлях у бакеті answer-photos>]]`, по одному на рядок.
 * Так нічого не міняється в схемі й старі відповіді читаються як раніше.
 */
export const PHOTO_BUCKET = 'answer-photos';
export const MAX_PHOTOS = 4;

const MARK = /\n?\[\[foto:([0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg)\]\]/g;

export function composeAnswer(text: string, paths: string[]): string {
  return [text.trim(), ...paths.map((p) => `[[foto:${p}]]`)].filter(Boolean).join('\n');
}

export function splitAnswer(answer: string | null | undefined): { text: string; photos: string[] } {
  const src = answer ?? '';
  const photos: string[] = [];
  const text = src.replace(MARK, (_m, p: string) => {
    photos.push(p);
    return '';
  });
  return { text: text.trim(), photos };
}
