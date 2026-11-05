import type { MockExam, MockScore, ItemResult } from './core';

/** Teacher-only Notion database «Wyniki — egzamin próbny B1» (page «Egzamin próbny B1» in Werba Way). */
const DEFAULT_DB = '8e2ceb755dc1451cada978409be51369';

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

type RichText = { type: 'text'; text: { content: string }; annotations?: Record<string, unknown> };

function rt(content: string, ann?: Record<string, unknown>): RichText {
  return { type: 'text', text: { content: content.slice(0, 1900) }, ...(ann ? { annotations: ann } : {}) };
}

function fmtPts(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function itemLine(r: ItemResult) {
  const given = r.status === 'empty' ? '— (brak odpowiedzi)' : r.given;
  return [
    rt(`${r.n}. `, { bold: true }),
    rt(`${r.label}  `),
    rt('→ uczeń: ', { color: 'gray' }),
    rt(given, { color: r.status === 'check' ? 'orange' : 'red' }),
    rt(r.status === 'check' ? '  · wzór: ' : '  · poprawnie: ', { color: 'gray' }),
    rt(r.expected, { color: 'green' }),
  ];
}

function head(s: string) {
  return s.split(' · ')[0].split(' / ')[0].replace(/^([a-e])\).*$/, '$1');
}

export function errorsSummary(score: MockScore): string {
  const parts: string[] = [];
  for (const t of score.tasks) {
    const bad = t.items.filter((r) => r.status === 'no' || r.status === 'empty');
    const chk = t.items.filter((r) => r.status === 'check');
    if (!bad.length && !chk.length) continue;
    const code = `${t.section.toUpperCase()}${t.id.replace(/\D/g, '')}`;
    const bits = bad.map((r) => `${r.n}: ${r.status === 'empty' ? '—' : head(r.given)}→${head(r.expected)}`);
    if (chk.length) bits.push(`do sprawdzenia: ${chk.map((r) => r.n).join(', ')}`);
    parts.push(`${code} (${fmtPts(t.points)}/${fmtPts(t.max)}) ${bits.join('; ')}`);
  }
  return parts.join('\n') || 'Bez błędów';
}

export function weakTopics(exam: MockExam, score: MockScore): string[] {
  const out: string[] = [];
  for (const t of score.tasks) {
    if (t.max && t.points / t.max < exam.pass_ratio) {
      const section = exam.sections.find((s) => s.id === t.section);
      out.push(t.topic ?? `${section?.tab ?? t.section}: ${t.title}`);
    }
  }
  return out;
}

function buildChildren(exam: MockExam, score: MockScore) {
  const blocks: unknown[] = [];
  const sec = score.sections
    .map((s) => `${s.title}: ${fmtPts(s.points)}/${s.max} ${s.passed ? '✓' : '✗'}`)
    .join('   ·   ');
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [rt(sec)],
      icon: { type: 'emoji', emoji: score.passed ? '✅' : '📉' },
      color: score.passed ? 'green_background' : 'red_background',
    },
  });
  if (score.pending) {
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          rt(
            `Do sprawdzenia: ${score.pending} przekształc. (Zadanie 6) — liczone jako 0 p., dopóki ich nie sprawdzisz.`
          ),
        ],
        icon: { type: 'emoji', emoji: '✍️' },
        color: 'orange_background',
      },
    });
  }

  for (const s of exam.sections) {
    const tasks = score.tasks.filter((t) => t.section === s.id);
    blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(s.title)] } });
    for (const t of tasks) {
      const wrong = t.items.filter((r) => r.status !== 'ok');
      const head = `${t.title}${t.topic ? ` · ${t.topic}` : ''} — ${fmtPts(t.points)}/${fmtPts(t.max)} p.`;
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [rt(head, wrong.length ? undefined : { color: 'green' })] },
      });
      for (const r of wrong) {
        blocks.push({
          object: 'block',
          type: r.status === 'check' ? 'to_do' : 'bulleted_list_item',
          [r.status === 'check' ? 'to_do' : 'bulleted_list_item']: {
            rich_text: itemLine(r),
            ...(r.status === 'check' ? { checked: false } : {}),
          },
        });
      }
      const noted = t.items.filter((r) => r.status === 'ok' && r.note);
      for (const r of noted) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [rt(`${r.n}. ✓ ${r.given} `), rt(`(${r.note} — zaliczone)`, { color: 'gray' })],
          },
        });
      }
    }
  }
  return blocks;
}

export async function writeMockResult(args: {
  exam: MockExam;
  score: MockScore;
  imie: string;
  minutes: number;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const token = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_MOCK_DATABASE_ID || DEFAULT_DB;
  if (!token) return { ok: false, error: 'NOTION_API_KEY missing' };

  const { exam, score } = args;
  const rt_ = score.sections.find((s) => s.id === 'rt');
  const pg = score.sections.find((s) => s.id === 'pg');
  const props: Record<string, unknown> = {
    Imię: { title: [rt(args.imie.slice(0, 200))] },
    Egzamin: { select: { name: exam.exam_label } },
    Wynik: { select: { name: score.passed ? 'Zdane' : 'Poniżej progu' } },
    'Czytanie (pkt)': { number: rt_?.points ?? null },
    'Gramatyka (pkt)': { number: pg?.points ?? null },
    'Razem %': { number: score.max ? Math.round((score.total / score.max) * 1000) / 1000 : 0 },
    'Do sprawdzenia': { number: score.pending },
    'Czas (min)': { number: Math.round(args.minutes) },
    Błędy: { rich_text: [rt(errorsSummary(score))] },
    'Lesson ID': { rich_text: [rt(exam.lesson_id)] },
  };
  const weak = weakTopics(exam, score);
  if (weak.length) {
    props['Słabe tematy'] = { multi_select: weak.slice(0, 20).map((name) => ({ name: name.slice(0, 100) })) };
  }

  const children = buildChildren(exam, score);
  const first = children.slice(0, 95);
  const rest = children.slice(95);

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: props, children: first }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Notion ${res.status}: ${text.slice(0, 300)}` };
  }
  const data = (await res.json()) as { url?: string; id?: string };

  for (let i = 0; i < rest.length && data.id; i += 95) {
    await fetch(`https://api.notion.com/v1/blocks/${data.id}/children`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ children: rest.slice(i, i + 95) }),
    }).catch(() => undefined);
  }
  return { ok: true, url: data.url };
}
