import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Mock exam: a full or partial exam set (state B1 or telc B1·B2) — listening with limited plays,
 * reading, grammar / language elements, and writing that the teacher marks by hand.
 * Content: src/content/queue-published/{lessonId}-mock.json
 * Answers never leave the server before the student submits (toPublicMockExam strips them).
 */

export type BankEntry = { key: string; text: string };

export type MockGap = {
  id: string;
  n: number;
  kind: 'options' | 'bank' | 'input';
  options?: string[];
  answer?: string;
  accept?: string[];
  /** how the correct answer is shown (default: accept[0]) */
  display?: string;
};

export type MockItem = {
  id: string;
  passage?: string;
  stem?: string;
  options?: string[];
  text?: string;
  sentence?: string;
  after?: string;
  reply?: string;
  keyword?: string;
  answer?: string;
  accept?: string[];
  model?: string;
  /** item rendered as a two-button true/false row inside an mc-passages task */
  kind?: 'tf';
  /** large picture (emoji) instead of text on the left of a matching task */
  emoji?: string;
};

export type WritingPart = { id: string; label: string; prompt: string; words?: number };
export type WritingChoice = { id: string; label: string; intro?: string; parts: WritingPart[] };
export type TaskAudio = { src: string; max_plays: number; note?: string };

export type MockTask = {
  id: string;
  title: string;
  topic?: string;
  layout: 'mc-passages' | 'true-false' | 'cloze' | 'matching' | 'questions' | 'transform' | 'writing';
  instruction?: string;
  /** optional time for this task, minutes; otherwise the UI splits the section time by points */
  minutes?: number;
  points_per_item: number;
  passage_title?: string;
  passage?: string;
  text?: string;
  bank?: BankEntry[];
  bank_words?: string[];
  right?: BankEntry[];
  example?: Record<string, unknown>;
  items?: MockItem[];
  gaps?: MockGap[];
  audio?: TaskAudio;
  /** shown to the student only after sending */
  transcript?: string;
  /** button labels for true/false rows; default TAK / NIE (telc: prawda / fałsz) */
  tf_labels?: [string, string];
  left_label?: string;
  right_label?: string;
  choices?: WritingChoice[];
  /** number shown for the first item (telc numbers items across the whole exam) */
  start_n?: number;
  /** matching: one key may answer several items (persons in an opinion task, telc «x») */
  reuse_keys?: boolean;
};

export type MockSection = {
  id: string;
  tab: string;
  title: string;
  minutes?: number;
  /** marked by the teacher (writing): not scored automatically, not in the pass rule */
  manual?: boolean;
  manual_points?: number;
  tasks: MockTask[];
};

export type MockExam = {
  lesson_id: string;
  exercise_type: 'mock-exam';
  exam_label: string;
  title: string;
  subtitle?: string;
  source?: string;
  pass_ratio: number;
  /** per-section: every scored section ≥ pass_ratio (state exam); telc: one test total → B1 / B2 */
  scoring?: 'per-section' | 'telc';
  /** telc thresholds on the scored total, e.g. { B1: 27, B2: 43 } */
  levels?: Record<string, number>;
  eyebrow?: string;
  rules?: string[];
  sections: MockSection[];
};

const ROOT = path.join(process.cwd(), 'src/content/queue-published');

export function loadMockExam(lessonId: string): MockExam | null {
  const full = path.join(ROOT, `${path.basename(lessonId)}-mock.json`);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf8')) as MockExam;
}

/** Client-safe copy: no answer / accept / model on scored items (examples keep theirs). */
export function toPublicMockExam(exam: MockExam) {
  return {
    lesson_id: exam.lesson_id,
    exam_label: exam.exam_label,
    title: exam.title,
    subtitle: exam.subtitle,
    source: exam.source,
    pass_ratio: exam.pass_ratio,
    scoring: exam.scoring ?? 'per-section',
    levels: exam.levels,
    eyebrow: exam.eyebrow,
    rules: exam.rules,
    sections: exam.sections.map((s) => ({
      id: s.id,
      tab: s.tab,
      title: s.title,
      minutes: s.minutes,
      manual: Boolean(s.manual),
      manual_points: s.manual_points,
      max_points: sectionMax(s),
      tasks: s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        topic: t.topic,
        layout: t.layout,
        instruction: t.instruction,
        minutes: t.minutes,
        points_per_item: t.points_per_item,
        max_points: taskMax(t),
        passage_title: t.passage_title,
        passage: t.passage,
        text: t.text,
        bank: t.bank,
        bank_words: t.bank_words ? uniq(t.bank_words) : undefined,
        right: t.right,
        example: t.example,
        audio: t.audio,
        has_transcript: Boolean(t.transcript),
        tf_labels: t.tf_labels,
        left_label: t.left_label,
        right_label: t.right_label,
        choices: t.choices,
        start_n: t.start_n,
        reuse_keys: t.reuse_keys,
        items: t.items?.map((it) => ({
          id: it.id,
          passage: it.passage,
          stem: it.stem,
          options: it.options,
          text: it.text,
          sentence: it.sentence,
          after: it.after,
          reply: it.reply,
          keyword: it.keyword,
          kind: it.kind,
          emoji: it.emoji,
        })),
        gaps: t.gaps?.map((g) => ({ id: g.id, n: g.n, kind: g.kind, options: g.options })),
      })),
    })),
  };
}

export type PublicMockExam = ReturnType<typeof toPublicMockExam>;

function uniq(a: string[]) {
  return a.filter((x, i) => a.indexOf(x) === i);
}

export function taskUnits(t: MockTask): number {
  return (t.items?.length ?? 0) + (t.gaps?.length ?? 0);
}
export function taskMax(t: MockTask): number {
  return taskUnits(t) * t.points_per_item;
}
export function sectionMax(s: MockSection): number {
  return s.tasks.reduce((a, t) => a + taskMax(t), 0);
}

const PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

export function norm(raw: string): string {
  return raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/[„”"“'’«»()]/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/[.,!?;:…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function stripPl(s: string): string {
  return s.replace(/[ąćęłńóśźż]/g, (c) => PL[c] ?? c);
}

export type ItemStatus = 'ok' | 'no' | 'empty' | 'check';

export type ItemResult = {
  id: string;
  section: string;
  task: string;
  n: number;
  label: string;
  given: string;
  expected: string;
  status: ItemStatus;
  note?: string;
  points: number;
};

export type TaskResult = {
  id: string;
  section: string;
  title: string;
  topic?: string;
  points: number;
  max: number;
  items: ItemResult[];
};

export type SectionResult = {
  id: string;
  title: string;
  points: number;
  max: number;
  passed: boolean;
  pending: number;
  manual?: boolean;
  manual_points?: number;
};

export type WritingResult = {
  task: string;
  title: string;
  choice: string;
  parts: Array<{ label: string; prompt: string; text: string; words: number; target?: number }>;
};

export type MockScore = {
  sections: SectionResult[];
  tasks: TaskResult[];
  total: number;
  max: number;
  pending: number;
  passed: boolean;
  /** telc: level reached in the scored test (B2 / B1 / poniżej B1) */
  level?: string;
  writing: WritingResult[];
};

export function wordCount(s: string): number {
  return (s.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

/** answer keys for a writing task: `${task}:choice` and `${task}:${part}` */
export function writingKeys(t: MockTask, choice: string): string[] {
  const c = t.choices?.find((x) => x.id === choice);
  return c ? c.parts.map((p) => `${t.id}:${p.id}`) : [];
}

type MatchResult = { ok: boolean; note?: string };

function matchText(given: string, accept: string[], stripTail?: string): MatchResult {
  let g = norm(given);
  if (stripTail) {
    const tail = norm(stripTail);
    if (tail && g.endsWith(tail) && g.length > tail.length) g = g.slice(0, -tail.length).trim();
  }
  if (!g) return { ok: false };
  const acc = accept.map(norm);
  if (acc.includes(g)) return { ok: true };
  const gs = stripPl(g);
  if (acc.some((a) => stripPl(a) === gs)) return { ok: true, note: 'bez polskich znaków' };
  return { ok: false };
}

const LETTERS = ['a', 'b', 'c', 'd', 'e'];

function snippetBefore(text: string, n: number): string {
  const marker = `{{${n}}}`;
  const i = text.indexOf(marker);
  if (i < 0) return '';
  const before = text
    .slice(0, i)
    .replace(/\{\{(ex|\d+)\}\}/g, '…')
    .split(/\s+/)
    .slice(-5)
    .join(' ');
  const after = text
    .slice(i + marker.length)
    .replace(/\{\{(ex|\d+)\}\}/g, '…')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  return `${before} ___ ${after}`.replace(/\n/g, ' ').trim();
}

function short(s: string, max = 70) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function scoreMockExam(exam: MockExam, answers: Record<string, string>): MockScore {
  const tasks: TaskResult[] = [];
  const sections: SectionResult[] = [];

  for (const s of exam.sections) {
    let sPoints = 0;
    let sPending = 0;
    for (const t of s.tasks) {
      const items: ItemResult[] = [];
      const ppi = t.points_per_item;
      const push = (r: Omit<ItemResult, 'section' | 'task' | 'points'>) => {
        const points = r.status === 'ok' ? ppi : 0;
        items.push({ ...r, section: s.id, task: t.id, points });
      };

      (t.items ?? []).forEach((it, idx) => {
        const n = (t.start_n ?? 1) + idx;
        const given = String(answers[it.id] ?? '').trim();
        if (t.layout === 'mc-passages' && it.kind === 'tf') {
          push({
            id: it.id,
            n,
            label: short(it.stem ?? it.text ?? ''),
            given,
            expected: it.answer ?? '',
            status: !given ? 'empty' : given === it.answer ? 'ok' : 'no',
          });
        } else if (t.layout === 'mc-passages') {
          const exp = it.answer ?? '';
          const optText = it.options?.[LETTERS.indexOf(exp)] ?? '';
          const gText = it.options?.[LETTERS.indexOf(given)] ?? '';
          push({
            id: it.id,
            n,
            label: short(it.passage || it.stem || ''),
            given: given ? `${given}) ${short(gText, 60)}` : '',
            expected: `${exp}) ${short(optText, 60)}`,
            status: !given ? 'empty' : given === exp ? 'ok' : 'no',
          });
        } else if (t.layout === 'true-false') {
          push({
            id: it.id,
            n,
            label: it.text ?? '',
            given,
            expected: it.answer ?? '',
            status: !given ? 'empty' : given === it.answer ? 'ok' : 'no',
          });
        } else if (t.layout === 'matching') {
          const right = t.right?.find((r) => r.key === it.answer);
          const gRight = t.right?.find((r) => r.key === given);
          push({
            id: it.id,
            n,
            label: it.emoji ?? short(it.text ?? '', 90),
            given: given ? `${given} · ${short(gRight?.text ?? '', 50)}` : '',
            expected: `${it.answer} · ${short(right?.text ?? '', 50)}`,
            status: !given ? 'empty' : given === it.answer ? 'ok' : 'no',
          });
        } else if (t.layout === 'questions') {
          const m = matchText(given, it.accept ?? [], it.after);
          push({
            id: it.id,
            n,
            label: `${(it.sentence ?? '').replace(/__/g, '')} → … ${it.after ?? ''}`,
            given,
            expected: (it.accept ?? [])[0] ?? '',
            status: !given ? 'empty' : m.ok ? 'ok' : 'no',
            note: m.ok ? m.note : undefined,
          });
        } else if (t.layout === 'transform') {
          const m = matchText(given, it.accept ?? []);
          push({
            id: it.id,
            n,
            label: `${it.sentence} (${it.keyword})`,
            given,
            expected: it.model ?? (it.accept ?? [])[0] ?? '',
            status: !given ? 'empty' : m.ok ? 'ok' : 'check',
            note: m.ok ? m.note : undefined,
          });
        }
      });

      for (const g of t.gaps ?? []) {
        const given = String(answers[g.id] ?? '').trim();
        const label = snippetBefore(t.text ?? '', g.n);
        if (g.kind === 'input') {
          const m = matchText(given, g.accept ?? []);
          push({
            id: g.id,
            n: g.n,
            label,
            given,
            expected: g.display ?? (g.accept ?? [])[0] ?? '',
            status: !given ? 'empty' : m.ok ? 'ok' : 'no',
            note: m.ok ? m.note : undefined,
          });
        } else if (g.kind === 'bank' && t.bank) {
          const e = t.bank.find((b) => b.key === g.answer);
          const gb = t.bank.find((b) => b.key === given);
          push({
            id: g.id,
            n: g.n,
            label,
            given: given ? `${given} · ${gb?.text ?? ''}` : '',
            expected: `${g.answer} · ${e?.text ?? ''}`,
            status: !given ? 'empty' : given === g.answer ? 'ok' : 'no',
          });
        } else {
          const exp = g.answer ?? '';
          const ok = given.toLowerCase() === exp.toLowerCase();
          push({
            id: g.id,
            n: g.n,
            label,
            given,
            expected: exp,
            status: !given ? 'empty' : ok ? 'ok' : 'no',
          });
        }
      }

      const points = items.reduce((a, r) => a + r.points, 0);
      sPoints += points;
      sPending += items.filter((r) => r.status === 'check').length;
      tasks.push({ id: t.id, section: s.id, title: t.title, topic: t.topic, points, max: taskMax(t), items });
    }
    const max = sectionMax(s);
    sections.push({
      id: s.id,
      title: s.title,
      points: sPoints,
      max,
      passed: sPoints >= max * exam.pass_ratio,
      pending: sPending,
      manual: Boolean(s.manual),
      manual_points: s.manual_points,
    });
  }

  const writing: WritingResult[] = [];
  for (const s of exam.sections) {
    for (const t of s.tasks) {
      if (t.layout !== 'writing') continue;
      const choiceId = String(answers[`${t.id}:choice`] ?? '');
      const c = t.choices?.find((x) => x.id === choiceId);
      if (!c) {
        writing.push({ task: t.id, title: t.title, choice: '', parts: [] });
        continue;
      }
      writing.push({
        task: t.id,
        title: t.title,
        choice: c.label,
        parts: c.parts.map((p) => {
          const text = String(answers[`${t.id}:${p.id}`] ?? '').trim();
          return { label: p.label, prompt: p.prompt, text, words: wordCount(text), target: p.words };
        }),
      });
    }
  }
  const writtenCount = writing.filter((w) => w.parts.some((p) => p.text)).length;

  const scored = sections.filter((s) => !s.manual && s.max > 0);
  const total = scored.reduce((a, s) => a + s.points, 0);
  const max = scored.reduce((a, s) => a + s.max, 0);
  let passed = scored.every((s) => s.passed);
  let level: string | undefined;
  if (exam.scoring === 'telc') {
    const lv = Object.entries(exam.levels ?? { B1: 27, B2: 43 }).sort((a, b) => b[1] - a[1]);
    level = lv.find(([, min]) => total >= min)?.[0] ?? 'poniżej B1';
    passed = level !== 'poniżej B1';
    for (const s of scored) s.passed = passed;
  }
  return {
    sections,
    tasks,
    total,
    max,
    pending: sections.reduce((a, s) => a + s.pending, 0) + writtenCount,
    passed,
    level,
    writing,
  };
}

export function transcriptsOf(exam: MockExam): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of exam.sections) for (const t of s.tasks) if (t.transcript) out[t.id] = t.transcript;
  return out;
}
