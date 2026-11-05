import manifest from '../../content-queue/_manifest.json';

const titles: Record<string, string> = Object.fromEntries(
  ((manifest as { lessons?: { lesson_id: string; title?: string }[] }).lessons ?? []).map((l) => [
    l.lesson_id,
    l.title ?? l.lesson_id,
  ])
);

/** Human lesson title from content-queue/_manifest.json, falls back to the id */
export function lessonTitle(lessonId: string) {
  return titles[lessonId] ?? lessonId;
}
