import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpenAIClient } from '@/lib/openai';
import { resolveOwner } from '../owner';

export const dynamic = 'force-dynamic';

const LANG: Record<string, string> = { uk: 'Ukrainian', ru: 'Russian', en: 'English', pl: 'Polish (a short Polish definition instead of a translation)' };
const DAILY_LIMIT_STUDENT = 60;

/** Чернетка картки слова (нічого не зберігає). Помилка / немає ключа → { draft: null }: ручний ввід. */
export async function POST(req: Request) {
  const supabase = createClient();
  const body = (await req.json().catch(() => null)) as { studentId?: string; input?: string } | null;
  const o = await resolveOwner(supabase, body?.studentId);
  if (!o.ok) return NextResponse.json({ error: o.error }, { status: o.status });
  const input = (body?.input ?? '').trim().slice(0, 120);
  if (!input) return NextResponse.json({ error: 'empty' }, { status: 400 });

  if (o.role === 'student') {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from('word_suggest_log').select('id', { count: 'exact', head: true }).eq('user_id', o.userId).gte('at', since);
    if ((count ?? 0) >= DAILY_LIMIT_STUDENT) return NextResponse.json({ draft: null, limited: true, lang: o.lang });
  }
  const ai = getOpenAIClient();
  if (!ai) return NextResponse.json({ draft: null, lang: o.lang, reason: 'no-key' });
  await supabase.from('word_suggest_log').insert({ user_id: o.userId });

  try {
    const r = await ai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'word_card',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['term', 'forms', 'translation', 'example', 'example_tr'],
              properties: {
                term: { type: 'string' },
                forms: { type: 'string' },
                translation: { type: 'string' },
                example: { type: 'string' },
                example_tr: { type: 'string' },
              },
            },
          },
        },
        messages: [
          {
            role: 'system',
            content:
              `You build vocabulary cards for learners of Polish. The input may be Polish, Ukrainian, Russian or English; if it is not Polish, give the Polish equivalent. ` +
              `term: base form in Polish (verb infinitive, noun in nominative singular, adjective masculine; a fixed phrase stays whole). ` +
              `forms: part of speech in Polish (czasownik, rzeczownik…) plus 1–3 key forms (aspect pair, gender, conjugation); leave empty if unsure — never invent forms. ` +
              `translation: translation into ${LANG[o.lang] ?? 'Ukrainian'}, short. ` +
              `example: one natural Polish sentence of 6–12 words, everyday or work context, level A2–B1. example_tr: its translation into the same language.`,
          },
          { role: 'user', content: input },
        ],
      },
      { timeout: 8000 }
    );
    const draft = JSON.parse(r.choices[0]?.message?.content ?? 'null');
    return NextResponse.json({ draft, lang: o.lang });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[words/suggest]', msg);
    return NextResponse.json({ draft: null, lang: o.lang, reason: msg.slice(0, 160) });
  }
}
