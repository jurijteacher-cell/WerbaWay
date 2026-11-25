import 'server-only';
import { getOpenAIClient } from '@/lib/openai';
import { wordCount, type MockExam, type MockTask } from './core';

/**
 * Оцінювання письмової частини пробного іспиту через OpenAI (orientacyjnie, як на іспиті).
 *
 * telc B1·B2: 1 e-mail, 4 критерії по 0–5 (Treść, Kompozycja, Poprawność, Słownictwo) = 20 сирих балів,
 *   переводяться в шкалу секції (`manual_points`, у наших JSON — 45). Рівень за сирими: 15–20 B2 · 7–14 B1 · 0–6 нижче B1.
 * Державний B1: 2 тексти з набору. Коротка форма (≤60 слів у ліміті) — 10 б., довга — 20 б. (разом 30 = `manual_points`).
 *   Довжину рахує код (±10% від ліміту), решту критеріїв — модель.
 *
 * Результат лежить у `mock_results.score.writing_ai` і показується учневі під його текстом.
 */

export type CriterionGrade = { id: string; name: string; points: number; max: number; comment: string };
export type Correction = { wrong: string; right: string; why: string };
export type PartGrade = {
  part: string;
  label: string;
  words: number;
  target?: number;
  points: number;
  max: number;
  criteria: CriterionGrade[];
  comment: string;
  corrections: Correction[];
  improved?: string;
};
export type WritingGrade = {
  task: string;
  choice: string;
  points: number;
  max: number;
  /** telc: сирі бали 0–20 і рівень за ними */
  raw?: number;
  raw_max?: number;
  level?: string;
  parts: PartGrade[];
  model: string;
  graded_at: string;
};

type Criterion = { id: string; name: string; max: number; hint: string };

const TELC: Criterion[] = [
  {
    id: 'tresc',
    name: 'Treść',
    max: 5,
    hint: 'all three required points covered and developed (each point: ++ fully, + partly, Ø missing); 5 = all three fully',
  },
  {
    id: 'kompozycja',
    name: 'Kompozycja',
    max: 5,
    hint: 'semi-formal e-mail form: greeting and closing formulas, paragraphs, logical order, connectors, register',
  },
  { id: 'poprawnosc', name: 'Poprawność', max: 5, hint: 'grammar, inflection, spelling and punctuation; errors that block understanding weigh most' },
  { id: 'slownictwo', name: 'Słownictwo', max: 5, hint: 'range and precision of vocabulary at B1/B2, no calques from Ukrainian/Russian' },
];

const STATE_SHORT: Criterion[] = [
  { id: 'tresc', name: 'Realizacja zadania i forma', max: 4, hint: 'all elements of the prompt, correct text type (invitation, notice, e-mail…), proper formulas' },
  { id: 'gramatyka', name: 'Poprawność gramatyczna', max: 2, hint: 'inflection, agreement, aspect, word order' },
  { id: 'slownictwo', name: 'Słownictwo', max: 2, hint: 'adequate and varied vocabulary' },
  { id: 'ortografia', name: 'Ortografia i interpunkcja', max: 1, hint: 'Polish letters, spelling, commas' },
];
const STATE_LONG: Criterion[] = [
  { id: 'tresc', name: 'Realizacja zadania i forma', max: 7, hint: 'topic, all elements of the prompt, genre conventions (opowiadanie, opis, recenzja, list…)' },
  { id: 'kompozycja', name: 'Kompozycja i spójność', max: 3, hint: 'introduction, development, ending; paragraphs; connectors' },
  { id: 'gramatyka', name: 'Poprawność gramatyczna', max: 4, hint: 'inflection, agreement, aspect, tenses, word order' },
  { id: 'slownictwo', name: 'Słownictwo', max: 3, hint: 'range and precision of vocabulary at B1, no calques' },
  { id: 'ortografia', name: 'Ortografia i interpunkcja', max: 2, hint: 'Polish letters, spelling, punctuation' },
];

const LANG: Record<string, string> = { uk: 'Ukrainian', ru: 'Russian', pl: 'Polish', en: 'English' };

function telcLevel(raw: number) {
  return raw >= 15 ? 'B2' : raw >= 7 ? 'B1' : 'poniżej B1';
}

const clamp = (n: unknown, max: number) => {
  const v = Math.round(Number(n) * 2) / 2;
  return Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0;
};

async function gradePart(opts: {
  examKind: 'telc' | 'state';
  criteria: Criterion[];
  prompt: string;
  text: string;
  target?: number;
  locale: string;
}): Promise<{ criteria: CriterionGrade[]; comment: string; corrections: Correction[]; improved?: string } | null> {
  const client = getOpenAIClient();
  if (!client) return null;
  const lang = LANG[opts.locale] ?? 'Ukrainian';
  const exam =
    opts.examKind === 'telc'
      ? 'telc Polski B1·B2 (written expression: semi-formal e-mail)'
      : 'Polish state certificate exam B1 (egzamin państwowy z języka polskiego jako obcego, pisanie)';
  const rubric = opts.criteria.map((c) => `- "${c.id}" (${c.name}), 0–${c.max}: ${c.hint}`).join('\n');
  const sys = `You are an examiner for the ${exam}. Grade one candidate text strictly but fairly, as on the real exam.
Criteria (integers or .5):
${rubric}
Rules: a text that ignores the topic gets 0 in every criterion; a misunderstood task gets 0 for the content criterion but the language is still graded. Do not reward length itself. Very short text (under half of the expected length) cannot get more than half of the content points.
Write every comment and every "why" in ${lang}, short and concrete, addressed to the student ("ти"/"you" form). Quote the student's own words in Polish in "wrong".
"corrections": up to 12 most important mistakes, each {"wrong": exact fragment from the text, "right": corrected Polish, "why": one short reason}.
"improved": the same text rewritten in correct, natural Polish at B1/B2, keeping the student's ideas and length.
Reply ONLY with JSON: {"criteria": {"<id>": {"points": number, "comment": string}}, "comment": "2-3 sentences overall", "corrections": [...], "improved": string}`;
  const user = JSON.stringify({ task: opts.prompt, expected_words: opts.target ?? null, words: wordCount(opts.text), text: opts.text });
  try {
    const r = await client.chat.completions.create(
      {
        model: 'gpt-4o',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
      },
      { timeout: 50_000 }
    );
    const raw = r.choices[0]?.message?.content;
    if (!raw) return null;
    const j = JSON.parse(raw) as {
      criteria?: Record<string, { points?: number; comment?: string }>;
      comment?: string;
      corrections?: Array<Partial<Correction>>;
      improved?: string;
    };
    return {
      criteria: opts.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        max: c.max,
        points: clamp(j.criteria?.[c.id]?.points, c.max),
        comment: String(j.criteria?.[c.id]?.comment ?? '').slice(0, 600),
      })),
      comment: String(j.comment ?? '').slice(0, 1200),
      corrections: (j.corrections ?? [])
        .filter((x) => x && x.wrong && x.right)
        .slice(0, 12)
        .map((x) => ({ wrong: String(x.wrong).slice(0, 200), right: String(x.right).slice(0, 200), why: String(x.why ?? '').slice(0, 300) })),
      improved: typeof j.improved === 'string' ? j.improved.slice(0, 4000) : undefined,
    };
  } catch (e) {
    console.error('[mock-exam] writing grade failed', (e as Error).message);
    return null;
  }
}

function writingTasks(exam: MockExam): Array<{ task: MockTask; manualPoints?: number }> {
  const out: Array<{ task: MockTask; manualPoints?: number }> = [];
  for (const s of exam.sections) for (const t of s.tasks) if (t.layout === 'writing') out.push({ task: t, manualPoints: s.manual_points });
  return out;
}

export function hasWritingText(exam: MockExam, answers: Record<string, string>): boolean {
  return writingTasks(exam).some(({ task }) => {
    const c = task.choices?.find((x) => x.id === answers[`${task.id}:choice`]);
    return Boolean(c?.parts.some((p) => (answers[`${task.id}:${p.id}`] ?? '').trim()));
  });
}

/** null — OpenAI не налаштовано або жодної відповіді моделі; [] — письма в іспиті немає. */
export async function gradeExamWriting(
  exam: MockExam,
  answers: Record<string, string>,
  locale: string
): Promise<WritingGrade[] | null> {
  if (!getOpenAIClient()) return null;
  const telc = exam.scoring === 'telc';
  const out: WritingGrade[] = [];
  let anyOk = false;
  for (const { task, manualPoints } of writingTasks(exam)) {
    const choiceId = answers[`${task.id}:choice`] ?? '';
    const choice = task.choices?.find((c) => c.id === choiceId);
    if (!choice) continue;
    const partsIn = choice.parts.map((p) => {
      const text = (answers[`${task.id}:${p.id}`] ?? '').trim();
      const short = Boolean(p.words && p.words <= 60);
      const criteria = telc ? TELC : short ? STATE_SHORT : STATE_LONG;
      return { p, text, criteria, short };
    });
    const graded = await Promise.all(
      partsIn.map(({ p, text, criteria }) =>
        text
          ? gradePart({ examKind: telc ? 'telc' : 'state', criteria, prompt: p.prompt, text, target: p.words, locale })
          : Promise.resolve({ criteria: criteria.map((c) => ({ id: c.id, name: c.name, max: c.max, points: 0, comment: '' })), comment: '', corrections: [] as Correction[], improved: undefined as string | undefined })
      )
    );
    if (graded.some((g, i) => partsIn[i].text && g)) anyOk = true;
    if (graded.some((g, i) => partsIn[i].text && !g)) return anyOk ? out : null; // половинчастої оцінки не зберігаємо

    const parts: PartGrade[] = partsIn.map(({ p, text }, i) => {
      const g = graded[i]!;
      const crit = [...g.criteria];
      const words = wordCount(text);
      if (!telc && p.words) {
        // довжина: лише в межах ±10% ліміту — 1 бал
        const lo = Math.floor(p.words * 0.9);
        const hi = Math.ceil(p.words * 1.1);
        crit.push({ id: 'dlugosc', name: 'Długość', max: 1, points: words >= lo && words <= hi ? 1 : 0, comment: `${words} / ${lo}–${hi}` });
      }
      const pts = crit.reduce((a, c) => a + c.points, 0);
      const max = crit.reduce((a, c) => a + c.max, 0);
      return { part: p.id, label: p.label, words, target: p.words, points: pts, max, criteria: crit, comment: g.comment, corrections: g.corrections, improved: g.improved };
    });

    const rawPts = parts.reduce((a, p) => a + p.points, 0);
    const rawMax = parts.reduce((a, p) => a + p.max, 0);
    const scale = manualPoints && rawMax ? manualPoints / rawMax : 1;
    const points = Math.round(rawPts * scale * 2) / 2;
    out.push({
      task: task.id,
      choice: choice.id,
      points,
      max: manualPoints ?? rawMax,
      ...(telc ? { raw: rawPts, raw_max: rawMax, level: telcLevel(rawPts) } : {}),
      parts,
      model: 'gpt-4o',
      graded_at: new Date().toISOString(),
    });
  }
  return out;
}
