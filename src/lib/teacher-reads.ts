/**
 * Listening read aloud by the teacher: the text must not reach the student's
 * browser at all (not even in the page payload). Strips item `dialogue` from
 * blocks with `audio_source: "teacher"` unless the page is in teacher mode.
 */
type AnyBlock = { audio_source?: string; items?: Array<Record<string, unknown>> } & Record<string, unknown>;

export function stripTeacherTexts<T>(data: T, teacherMode: boolean): T {
  if (teacherMode || !data || typeof data !== 'object') return data;
  const d = data as unknown as { blocks?: AnyBlock[] };
  if (!Array.isArray(d.blocks)) return data;
  return {
    ...(data as object),
    blocks: d.blocks.map((b) =>
      b.audio_source === 'teacher'
        ? { ...b, items: (b.items ?? []).map(({ dialogue: _omit, ...rest }) => rest) }
        : b
    ),
  } as T;
}
