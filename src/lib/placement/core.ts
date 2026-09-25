import { readFileSync, existsSync } from 'fs';
import path from 'path';

export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type PlacementResultLevel =
  | 'A1 (start)'
  | 'A1'
  | 'A1+'
  | 'A2'
  | 'A2+'
  | 'B1'
  | 'B1+'
  | 'B2';

export type PlacementItem = {
  id: string;
  topic?: string;
  text: string;
  options?: string[];
  answer?: string;
  accept?: string[];
  trap?: 'kalka-uk' | 'false-friend' | string;
  explanation?: string;
};

export type PlacementBlock = {
  block_id: string;
  level: PlacementLevel | 'all';
  part: 'gramatyka' | 'słownictwo' | 'czytanie' | 'pisanie' | string;
  exercise_type: string;
  title: string;
  instruction?: string;
  passage_title?: string;
  passage?: string;
  items?: PlacementItem[];
  variants?: Record<
    string,
    { prompt_pl: string; prompt_uk: string; min_words: number; max_words: number }
  >;
};

export type PlacementTest = {
  lesson_id: string;
  exercise_type: 'placement-test';
  title: string;
  instruction?: string;
  estimated_minutes?: number;
  scoring: {
    levels_order: PlacementLevel[];
    pass_threshold: number;
    plus_threshold: number;
    dont_know_option: string;
    writing_variant_by_level: Record<string, 'A' | 'B'>;
  };
  results: Record<
    string,
    { display?: string; text_pl?: string; text_uk?: string } | string
  >;
  blocks: PlacementBlock[];
};

const ROOT = path.join(process.cwd(), 'src/content/queue-published');

export function loadPlacementTest(lessonId: string): PlacementTest | null {
  const full = path.join(ROOT, `${lessonId}-test.json`);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf8')) as PlacementTest;
}

/** Client-safe copy: no answer / accept / trap / explanation. */
export function toPublicPlacement(test: PlacementTest) {
  return {
    lesson_id: test.lesson_id,
    exercise_type: test.exercise_type,
    title: test.title,
    instruction: test.instruction,
    estimated_minutes: test.estimated_minutes,
    scoring: {
      levels_order: test.scoring.levels_order,
      dont_know_option: test.scoring.dont_know_option,
      writing_variant_by_level: test.scoring.writing_variant_by_level,
    },
    results: {
      plus_note_pl: test.results.plus_note_pl,
      plus_note_uk: test.results.plus_note_uk,
      footer_pl: test.results.footer_pl,
      footer_uk: test.results.footer_uk,
    },
    blocks: test.blocks.map((b) => ({
      block_id: b.block_id,
      level: b.level,
      part: b.part,
      exercise_type: b.exercise_type,
      title: b.title,
      instruction: b.instruction,
      passage_title: b.passage_title,
      passage: b.passage,
      variants: b.variants,
      items: (b.items ?? []).map((it) => ({
        id: it.id,
        topic: it.topic,
        text: it.text,
        options: it.options,
        open: Boolean(it.accept?.length) || (!it.options?.length && !it.answer),
      })),
    })),
  };
}

export function normalizeOpenAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?]+$/g, '');
}

export function isDontKnow(value: string | undefined, label: string): boolean {
  if (!value) return false;
  const v = value.trim();
  return v === label || v === 'Nie wiem' || v.startsWith('Nie wiem');
}

export function scoreItem(
  item: PlacementItem,
  answer: string | undefined,
  dontKnowLabel: string
): boolean {
  if (!answer || isDontKnow(answer, dontKnowLabel)) return false;
  if (item.accept?.length) {
    const n = normalizeOpenAnswer(answer);
    return item.accept.some((a) => normalizeOpenAnswer(a) === n);
  }
  if (item.answer != null) {
    return answer.trim() === item.answer;
  }
  return false;
}

export type LevelAnswers = Record<string, string>;

export type LevelScoreDetail = {
  level: PlacementLevel;
  score: number;
  correct: number;
  total: number;
  byPart: Record<string, { correct: number; total: number }>;
  errors: Array<{
    id: string;
    answer: string;
    topic?: string;
    trap?: string;
    part: string;
  }>;
};

export function scoreLevel(
  test: PlacementTest,
  level: PlacementLevel,
  answers: LevelAnswers
): LevelScoreDetail {
  const blocks = test.blocks.filter((b) => b.level === level);
  let correct = 0;
  let total = 0;
  const byPart: Record<string, { correct: number; total: number }> = {};
  const errors: LevelScoreDetail['errors'] = [];
  const dk = test.scoring.dont_know_option;

  for (const block of blocks) {
    const part = block.part;
    if (!byPart[part]) byPart[part] = { correct: 0, total: 0 };
    for (const item of block.items ?? []) {
      total += 1;
      byPart[part].total += 1;
      const ans = answers[item.id];
      const ok = scoreItem(item, ans, dk);
      if (ok) {
        correct += 1;
        byPart[part].correct += 1;
      } else {
        errors.push({
          id: item.id,
          answer: ans ?? '',
          topic: item.topic,
          trap: item.trap,
          part,
        });
      }
    }
  }

  return {
    level,
    score: total ? correct / total : 0,
    correct,
    total,
    byPart,
    errors,
  };
}

export function computeFinalLevel(
  test: PlacementTest,
  levelScores: LevelScoreDetail[]
): {
  level: PlacementResultLevel;
  passed: PlacementLevel | null;
  failScore: number | null;
} {
  const order = test.scoring.levels_order;
  const passT = test.scoring.pass_threshold;
  const plusT = test.scoring.plus_threshold;
  let passed: PlacementLevel | null = null;
  let failScore: number | null = null;

  for (const L of order) {
    const detail = levelScores.find((s) => s.level === L);
    if (!detail) break;
    if (detail.score >= passT) {
      passed = L;
    } else {
      failScore = detail.score;
      break;
    }
  }

  if (passed == null) {
    return { level: 'A1 (start)', passed: null, failScore };
  }
  if (failScore != null && failScore >= plusT && passed !== 'B2') {
    return { level: `${passed}+` as PlacementResultLevel, passed, failScore };
  }
  return { level: passed, passed, failScore };
}

export function nextLevelLabel(level: PlacementLevel): PlacementLevel | null {
  const order: PlacementLevel[] = ['A1', 'A2', 'B1', 'B2'];
  const i = order.indexOf(level);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

export function resultCopy(test: PlacementTest, level: PlacementResultLevel) {
  const baseKey = level.endsWith('+') ? (level.slice(0, -1) as PlacementLevel) : level;
  const entry = test.results[baseKey === 'A1 (start)' ? 'A1 (start)' : baseKey] as
    | { display?: string; text_pl?: string; text_uk?: string }
    | undefined;
  const isPlus = level.endsWith('+');
  const next = isPlus ? nextLevelLabel(baseKey as PlacementLevel) : null;
  const plusPl = String(test.results.plus_note_pl ?? '').replace('{next}', next ?? '');
  const plusUk = String(test.results.plus_note_uk ?? '').replace('{next}', next ?? '');
  return {
    level,
    display: entry?.display ?? (baseKey === 'A1 (start)' ? 'A1' : String(baseKey)),
    text_pl: entry?.text_pl ?? '',
    text_uk: entry?.text_uk ?? '',
    plus_note_pl: isPlus ? plusPl : '',
    plus_note_uk: isPlus ? plusUk : '',
    footer_pl: String(test.results.footer_pl ?? ''),
    footer_uk: String(test.results.footer_uk ?? ''),
  };
}
