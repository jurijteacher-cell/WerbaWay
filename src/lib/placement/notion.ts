import type { PlacementResultLevel } from './core';

export type PlacementNotionPayload = {
  imie: string;
  lessonId: string;
  level: PlacementResultLevel;
  levelPercents: Partial<Record<'A1' | 'A2' | 'B1' | 'B2', number>>;
  partPercents: Partial<Record<'gramatyka' | 'słownictwo' | 'czytanie', number>>;
  kalki: number;
  falseFriends: number;
  weakTopics: string[];
  errorsText: string;
  writingText: string;
  writingVariant: 'A' | 'B';
  minutes: number;
};

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

/** Write one results row. Returns page URL or null if env not configured / failed. */
export async function writePlacementResult(
  payload: PlacementNotionPayload
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const token = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
  const databaseId =
    process.env.NOTION_PLACEMENT_DATABASE_ID || '7d440a2a69ba4bcaa67bb27ad861145a';

  if (!token) {
    return { ok: false, error: 'NOTION_API_KEY missing' };
  }

  const props: Record<string, unknown> = {
    Imię: { title: [{ text: { content: payload.imie.slice(0, 200) } }] },
    Poziom: { select: { name: payload.level } },
    'Wariant pisania': { select: { name: payload.writingVariant } },
    'Czas (min)': { number: Math.round(payload.minutes * 10) / 10 },
    Kalki: { number: payload.kalki },
    'Fałszywi przyjaciele': { number: payload.falseFriends },
    Błędy: {
      rich_text: [{ text: { content: payload.errorsText.slice(0, 1900) } }],
    },
    Tekst: {
      rich_text: [{ text: { content: payload.writingText.slice(0, 1900) } }],
    },
    'Lesson ID': {
      rich_text: [{ text: { content: payload.lessonId } }],
    },
  };

  for (const L of ['A1', 'A2', 'B1', 'B2'] as const) {
    const v = payload.levelPercents[L];
    if (typeof v === 'number') {
      props[`${L} %`] = { number: Math.round(v * 1000) / 1000 };
    }
  }

  const partMap: Record<string, string> = {
    gramatyka: 'Gramatyka %',
    słownictwo: 'Słownictwo %',
    czytanie: 'Czytanie %',
  };
  for (const [part, prop] of Object.entries(partMap)) {
    const v = payload.partPercents[part as keyof typeof payload.partPercents];
    if (typeof v === 'number') {
      props[prop] = { number: Math.round(v * 1000) / 1000 };
    }
  }

  if (payload.weakTopics.length) {
    props['Słabe tematy'] = {
      multi_select: payload.weakTopics.slice(0, 40).map((name) => ({ name: name.slice(0, 100) })),
    };
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: props,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Notion ${res.status}: ${text.slice(0, 300)}` };
  }

  const data = (await res.json()) as { url?: string; id?: string };
  return { ok: true, url: data.url };
}
