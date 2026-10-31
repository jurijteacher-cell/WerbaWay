type Line = { speaker?: string; line?: string };

type Props = {
  /** How many times the teacher reads the text (shown to the student). */
  times?: number;
  /** Text to read aloud — rendered only in teacher mode (?teacher=1). */
  lines?: Line[];
  teacherMode?: boolean;
  label?: string;
};

const TIMES: Record<number, string> = { 1: 'raz', 2: 'dwa razy', 3: 'trzy razy' };

/**
 * Listening without recordings: the teacher reads the text aloud.
 * Students see only the sticker; the text is shown with ?teacher=1.
 */
export function TeacherReads({ times, lines, teacherMode, label = 'Słuchaj — czyta nauczyciel' }: Props) {
  const visible = teacherMode ? (lines ?? []).filter((l) => l.line) : [];
  return (
    <div className="nb-cassette nb-teacher-reads" data-role="teacher-reads" data-times={times ?? undefined}>
      <span className="nb-teacher-reads-label">{label}</span>
      {times ? <span className="nb-cassette-left">{TIMES[times] ?? `${times} razy`}</span> : null}
      {visible.length ? (
        <div className="nb-teacher-reads-text" data-role="teacher-text">
          {visible.map((l, i) => (
            <p key={i}>
              {l.speaker ? <strong>{l.speaker}: </strong> : null}
              {l.line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
