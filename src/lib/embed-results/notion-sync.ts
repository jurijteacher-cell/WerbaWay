import { lessonTitle } from '@/lib/lesson-titles';

/**
 * Supabase → Notion: «Учні» and «Результати» databases on the page
 * «📊 Результати учнів» (Werba Way). See docs/EMBED_RESULTS.md.
 */
export const NOTION_STUDENTS_DB = process.env.NOTION_EMBED_STUDENTS_DB || '04b2293bdbeb47f3a2d386424e2cc03d';
export const NOTION_RESULTS_DB = process.env.NOTION_EMBED_RESULTS_DB || 'c2ec981946f846b2bb8382f11e14daa9';

export type SyncAttempt = {
  block_id: string | null;
  item_id: string;
  item_type: string | null;
  grammar_point: string | null;
  prompt: string | null;
  answer: string | null;
  expected: string | null;
  is_correct: boolean | null;
  attempt_no: number;
  created_at: string;
};

export type SyncResult = {
  student_id: string;
  lesson_id: string;
  embed: string;
  last_at: string;
  notion_page_id: string | null;
  detail_block_id: string | null;
  attempts: SyncAttempt[];
};

export type SyncStudent = {
  id: string;
  code: string | null;
  name: string;
  note: string | null;
  self_created: boolean;
  archived: boolean;
  lessons: number;
  first_total: number;
  first_ok: number;
  open_answers: number;
  last_at: string | null;
  sync_upto: string;
  notion_page_id: string | null;
};

export type SaveItem = {
  kind: 'student' | 'result';
  key: string;
  notion_page_id: string;
  detail_block_id?: string | null;
  synced_upto: string;
};

const EMBED_LABEL: Record<string, string> = {
  grammar: 'Gramatyka',
  hw: 'Praca domowa',
  exam: 'Egzamin',
  'grammar-board': 'Tablica',
};

// ---------- Notion API helpers ----------

type RT = { type: 'text'; text: { content: string }; annotations?: Record<string, unknown> };
const rt = (content: string, ann?: Record<string, unknown>): RT => ({
  type: 'text',
  text: { content: content.slice(0, 1900) },
  ...(ann ? { annotations: ann } : {}),
});

/** Notion date in Kyiv time (shows the same clock time the teacher lives in) */
function kyivDate(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return { start: parts.replace(' ', 'T') + ':00', time_zone: 'Europe/Kiev' };
}

const pct = (ok: number, total: number) => (total ? Math.round((ok / total) * 1000) / 1000 : null);

export class NotionClient {
  constructor(private token: string) {}

  async call<T = unknown>(method: string, path: string, body?: unknown, retry = 2): Promise<T> {
    const res = await fetch(`https://api.notion.com/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && retry > 0) {
      const wait = Number(res.headers.get('retry-after') ?? '1') * 1000;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      return this.call(method, path, body, retry - 1);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion ${res.status} ${method} ${path}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }
}

// ---------- students ----------

export async function upsertStudent(n: NotionClient, s: SyncStudent): Promise<string> {
  const properties: Record<string, unknown> = {
    'Ім’я': { title: [rt(s.name)] },
    Код: { rich_text: [rt(s.code ?? "")] },
    Статус: { select: { name: s.archived ? 'Архів' : 'Активний' } },
    'Код створив': { select: { name: s.self_created ? 'Учень сам' : 'Викладач' } },
    Примітка: { rich_text: s.note ? [rt(s.note)] : [] },
    Уроків: { number: s.lessons },
    'З першої спроби': { number: pct(s.first_ok, s.first_total) },
    'Перевірено завдань': { number: s.first_total },
    'Письмових відповідей': { number: s.open_answers },
    'Остання активність': { date: s.last_at ? kyivDate(s.last_at) : null },
  };
  if (s.notion_page_id) {
    try {
      await n.call('PATCH', `pages/${s.notion_page_id}`, { properties, archived: false });
      return s.notion_page_id;
    } catch (e) {
      // page deleted by hand → create a new one
      if (!/Notion (404|400)/.test(String(e))) throw e;
    }
  }
  const page = await n.call<{ id: string }>('POST', 'pages', {
    parent: { database_id: NOTION_STUDENTS_DB },
    icon: { type: 'emoji', emoji: s.self_created ? '🙋' : '👤' },
    properties,
  });
  return page.id;
}

// ---------- results ----------

type ItemSummary = {
  id: string;
  type: string | null;
  grammarPoint: string | null;
  prompt: string | null;
  expected: string | null;
  open: boolean;
  firstOk: boolean | null;
  solved: boolean;
  wrong: string[];
  lastAnswer: string | null;
  lastAt: string;
  versions: number;
};

function summarize(attempts: SyncAttempt[]) {
  const blocks = new Map<string, Map<string, ItemSummary>>();
  for (const a of attempts) {
    const bk = a.block_id ?? '—';
    let B = blocks.get(bk);
    if (!B) blocks.set(bk, (B = new Map()));
    let it = B.get(a.item_id);
    if (!it) {
      it = {
        id: a.item_id,
        type: a.item_type,
        grammarPoint: a.grammar_point,
        prompt: a.prompt,
        expected: a.expected,
        open: a.is_correct === null,
        firstOk: a.is_correct,
        solved: false,
        wrong: [],
        lastAnswer: null,
        lastAt: a.created_at,
        versions: 0,
      };
      B.set(a.item_id, it);
    }
    it.versions++;
    it.lastAnswer = a.answer;
    it.lastAt = a.created_at;
    if (a.is_correct === true) it.solved = true;
    if (a.is_correct === false && !it.solved && a.answer && !it.wrong.includes(a.answer)) it.wrong.push(a.answer);
  }
  return blocks;
}

function buildDetail(blocks: Map<string, Map<string, ItemSummary>>) {
  const children: unknown[] = [];
  const push = (b: unknown) => {
    if (children.length < 98) children.push(b);
  };
  let skipped = 0;

  for (const [blockId, items] of blocks) {
    const list = Array.from(items.values());
    const scored = list.filter((i) => !i.open);
    const ok = scored.filter((i) => i.firstOk).length;
    const mistakes = scored.filter((i) => !i.firstOk);
    const open = list.filter((i) => i.open);
    const p = scored.length ? Math.round((ok / scored.length) * 100) : null;
    const color = p == null ? 'default' : p >= 80 ? 'green' : p >= 60 ? 'yellow' : 'red';
    push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [
          rt(`${blockId}  `),
          ...(p == null ? [] : [rt(`${p}%`, { color, bold: true }), rt(`  (${ok}/${scored.length} з першої спроби)`, { color: 'gray' })]),
        ],
      },
    });
    if (scored.length && !mistakes.length) {
      push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('✓ без помилок', { color: 'green' })] } });
    }
    for (const m of mistakes) {
      if (children.length >= 98) {
        skipped++;
        continue;
      }
      const parts: RT[] = [];
      if (m.prompt) parts.push(rt(`${m.prompt}\n`, { color: 'gray' }));
      parts.push(rt(m.wrong.length ? m.wrong.join(' · ') : '—', { color: 'red', strikethrough: true }));
      parts.push(rt('  →  ', { color: 'gray' }));
      parts.push(rt(m.expected ?? '—', { color: 'green', bold: true }));
      parts.push(
        rt(m.solved ? `   виправив(ла) з ${m.versions}-ї спроби` : '   не розв’язано', {
          color: m.solved ? 'gray' : 'orange',
        })
      );
      if (m.grammarPoint) parts.push(rt(`   ${m.grammarPoint}`, { color: 'gray', code: true }));
      push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: parts } });
    }
    for (const o of open) {
      if (children.length >= 98) {
        skipped++;
        continue;
      }
      push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [
            ...(o.prompt ? [rt(`${o.prompt}\n`, { color: 'gray', italic: true })] : []),
            rt(o.lastAnswer ?? ''),
            rt(`\n${o.versions > 1 ? `версія ${o.versions} · ` : ''}✍️ письмова відповідь`, { color: 'gray' }),
          ],
        },
      });
    }
  }
  if (skipped) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [rt(`… ще ${skipped} — дивись кабінет на сайті`, { color: 'gray' })] },
    });
  }
  return children;
}

export async function upsertResult(
  n: NotionClient,
  r: SyncResult,
  studentPageId: string
): Promise<{ pageId: string; detailId: string | null }> {
  const blocks = summarize(r.attempts ?? []);
  const all = Array.from(blocks.values()).flatMap((m) => Array.from(m.values()));
  const scored = all.filter((i) => !i.open);
  const ok = scored.filter((i) => i.firstOk).length;
  const weak = Array.from(
    new Set(scored.filter((i) => !i.firstOk && i.grammarPoint).map((i) => i.grammarPoint as string))
  ).slice(0, 10);
  const lesson = lessonTitle(r.lesson_id);
  const label = EMBED_LABEL[r.embed] ?? r.embed;

  const properties: Record<string, unknown> = {
    Назва: { title: [rt(`${lesson} · ${label}`)] },
    Учень: { relation: [{ id: studentPageId }] },
    Урок: { rich_text: [rt(lesson)] },
    Вправа: { select: { name: label } },
    'З першої спроби': { number: pct(ok, scored.length) },
    Завдань: { number: scored.length },
    Помилок: { number: scored.length - ok },
    'Не розв’язано': { number: scored.filter((i) => !i.firstOk && !i.solved).length },
    Письмо: { number: all.filter((i) => i.open).length },
    'Слабкі теги': { multi_select: weak.map((name) => ({ name: name.slice(0, 100).replace(/,/g, ' ') })) },
    'Остання спроба': { date: kyivDate(r.last_at) },
    'Lesson ID': { rich_text: [rt(r.lesson_id)] },
  };

  let pageId = r.notion_page_id;
  let detailId = r.detail_block_id;
  if (pageId) {
    try {
      await n.call('PATCH', `pages/${pageId}`, { properties, archived: false });
    } catch (e) {
      if (!/Notion (404|400)/.test(String(e))) throw e;
      pageId = null;
      detailId = null;
    }
  }
  if (!pageId) {
    const page = await n.call<{ id: string }>('POST', 'pages', {
      parent: { database_id: NOTION_RESULTS_DB },
      icon: { type: 'emoji', emoji: r.embed === 'exam' ? '🎓' : r.embed === 'hw' ? '🏠' : '✏️' },
      properties,
    });
    pageId = page.id;
    detailId = null;
  }

  // details: one callout that is replaced as a whole on every sync
  if (detailId) {
    await n.call('DELETE', `blocks/${detailId}`).catch(() => undefined);
  }
  const updated = kyivDate(new Date().toISOString()).start.replace('T', ' ').slice(0, 16);
  const appended = await n.call<{ results: { id: string }[] }>('PATCH', `blocks/${pageId}/children`, {
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [rt('Деталі', { bold: true }), rt(`  · оновлено ${updated}`, { color: 'gray' })],
          icon: { type: 'emoji', emoji: '📋' },
          color: 'gray_background',
          children: buildDetail(blocks),
        },
      },
    ],
  });
  return { pageId, detailId: appended.results?.[0]?.id ?? null };
}
