import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import type {
  FlipTaskExercise,
  GrammarBoardExercise,
  GrammarPyramidExercise,
  GrammarPyramidItem,
  HomeworkExercise,
  PictureSetExercise,
  QueueExerciseBundle,
  VocabCardsExercise,
} from './queue-types';

const ROOT = path.join(process.cwd(), 'src/content/queue-published');

function readJson<T>(file: string): T | null {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf8')) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVocab(raw: any): VocabCardsExercise {
  return {
    lesson_id: raw.lesson_id,
    exercise_type: 'vocab-cards',
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    groups: raw.groups,
    meta: raw.meta ?? (raw.estimated_minutes ? { estimated_minutes: raw.estimated_minutes } : undefined),
    items: (raw.items ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any, i: number) => ({
        id: it.id ?? i + 1,
        term: it.term,
        definition: it.definition,
        example_sentence: it.example_sentence ?? it.example ?? '',
        part_of_speech: it.part_of_speech,
        translation_uk: it.translation_uk,
        group: it.group,
      })
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePictures(raw: any): PictureSetExercise {
  return {
    lesson_id: raw.lesson_id,
    exercise_type: 'picture-set',
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    image_constraints: raw.image_constraints,
    layout: raw.layout,
    phrase_bank: raw.phrase_bank,
    items: (raw.items ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any, i: number) => {
        const images = Array.isArray(it.images)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            it.images.map((img: any) => ({
              role: img.role,
              image_keywords: img.image_keywords,
              alt: img.alt,
              image_url: img.image_url,
            }))
          : undefined;
        return {
          id: it.id ?? i + 1,
          label: it.label,
          note: it.note,
          image_keywords: it.image_keywords ?? images?.[0]?.image_keywords,
          question: it.question,
          alt: it.alt ?? images?.[0]?.alt,
          image_url: it.image_url ?? images?.[0]?.image_url,
          images,
        };
      }
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFlip(raw: any): FlipTaskExercise {
  return {
    lesson_id: raw.lesson_id,
    exercise_type: 'flip-task',
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    items: (raw.items ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any, i: number) => ({
        id: it.id ?? i + 1,
        front_title: it.front_title,
        back_scenario: it.back_scenario,
        back_checklist: it.back_checklist ?? [],
      })
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGrammarItem(it: any, i: number): GrammarPyramidItem {
  const id = it.id ?? i + 1;
  if (it.left != null && it.right != null) {
    return { id, prompt: it.left, answer: it.right };
  }
  if (it.text != null) {
    return {
      id,
      sentence: it.text,
      answer: it.answer,
      options: it.options,
      explanation: it.explanation,
    };
  }
  if (it.prompt != null && it.words == null) {
    return {
      id,
      prompt: it.prompt,
      answer: it.answer,
      answer_hint: it.answer_hint ?? it.answer,
    };
  }
  return {
    id,
    prompt: it.prompt,
    answer: it.answer,
    answer_hint: it.answer_hint,
    sentence: it.sentence,
    words: it.words,
    options: it.options,
    explanation: it.explanation,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGrammar(raw: any): GrammarPyramidExercise {
  if (Array.isArray(raw.levels)) {
    return {
      lesson_id: raw.lesson_id,
      exercise_type: raw.exercise_type,
      title: raw.title,
      instructions: raw.instructions ?? raw.instruction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      levels: raw.levels.map((l: any, i: number) => ({
        level: l.level ?? i + 1,
        name: l.name,
        task_type: l.task_type,
        instruction: l.instruction,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (l.items ?? []).map((it: any, j: number) => normalizeGrammarItem(it, j)),
      })),
    };
  }

  const blocks = raw.blocks ?? [];
  return {
    lesson_id: raw.lesson_id,
    exercise_type: raw.exercise_type,
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    levels: blocks.map((b: any, i: number) => {
      let taskType = b.exercise_type ?? 'fill-in-blank';
      const first = b.items?.[0];
      // prompt/answer without words → transform-style open check
      if (taskType === 'sentence-building' && first?.prompt && !first?.words) {
        taskType = 'text-transform';
      }
      // drag bank → chip picker fill-in-blank (same UX as notebook prototype)
      if (taskType === 'drag-and-drop') {
        taskType = 'fill-in-blank';
      }
      const bank: string[] | undefined = Array.isArray(b.bank) ? b.bank : undefined;
      return {
        level: i + 1,
        name: b.title ?? `Poziom ${i + 1}`,
        task_type: taskType,
        instruction: b.instruction,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (b.items ?? []).map((it: any, j: number) => {
          const normalized = normalizeGrammarItem(it, j);
          if (bank?.length && !normalized.options?.length && normalized.sentence) {
            return { ...normalized, options: bank };
          }
          return normalized;
        }),
      };
    }),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGrammarBoard(raw: any): GrammarBoardExercise {
  return {
    lesson_id: raw.lesson_id,
    exercise_type: 'grammar-board',
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    layout: raw.layout,
    columns: raw.columns,
    style: raw.style,
    sections: raw.sections,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cards: (raw.cards ?? []).map((c: any, i: number) => ({
      id: c.id ?? i + 1,
      number: c.number ?? i + 1,
      section: c.section,
      color_group: c.color_group,
      rubric: c.rubric,
      lead: c.lead,
      rows: c.rows,
      sticker: c.sticker,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks: (c.tasks ?? []).map((t: any) => ({
        task_id: t.task_id,
        exercise_type: t.exercise_type,
        instruction: t.instruction,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (t.items ?? []).map((it: any, j: number) => ({
          id: it.id ?? j + 1,
          text: it.text,
          sentence: it.sentence,
          prompt: it.prompt,
          answer: it.answer,
          options: it.options,
          explanation: it.explanation,
        })),
      })),
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeHw(raw: any): HomeworkExercise {
  if (Array.isArray(raw.blocks)) {
    const grammar = normalizeGrammar(raw);
    return {
      lesson_id: raw.lesson_id,
      exercise_type: raw.exercise_type,
      title: raw.title,
      instructions: raw.instructions ?? raw.instruction,
      levels: grammar.levels,
    };
  }
  return {
    lesson_id: raw.lesson_id,
    exercise_type: raw.exercise_type,
    title: raw.title,
    instructions: raw.instructions ?? raw.instruction,
    vocab_review: raw.vocab_review,
    video: raw.video,
    grammar_exercises: raw.grammar_exercises,
    writing_task: raw.writing_task,
  };
}

export function getQueueBundle(lessonId: string): QueueExerciseBundle | null {
  const vocabRaw = readJson<unknown>(`${lessonId}-vocab.json`);
  const picturesRaw = readJson<unknown>(`${lessonId}-pictures.json`);
  const commRaw = readJson<unknown>(`${lessonId}-comm-tasks.json`);
  const grammarBoardRaw = readJson<unknown>(`${lessonId}-grammar-board.json`);
  const grammarRaw = readJson<unknown>(`${lessonId}-grammar.json`);
  const hwRaw = readJson<unknown>(`${lessonId}-hw.json`);
  // pictures.json is optional (some lessons have no picture-set)
  if (!vocabRaw || !commRaw || !grammarRaw || !hwRaw) return null;
  return {
    vocab: normalizeVocab(vocabRaw),
    pictures: picturesRaw ? normalizePictures(picturesRaw) : undefined,
    commTasks: normalizeFlip(commRaw),
    grammarBoard: grammarBoardRaw ? normalizeGrammarBoard(grammarBoardRaw) : undefined,
    grammar: normalizeGrammar(grammarRaw),
    hw: normalizeHw(hwRaw),
  };
}

export function listPublishedLessonIds(): string[] {
  if (!existsSync(ROOT)) return [];
  const files = readdirSync(ROOT);
  const ids = new Set<string>();
  for (const f of files) {
    const m = f.match(/^(.+)-vocab\.json$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}
