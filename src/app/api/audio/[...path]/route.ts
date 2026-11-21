import { NextResponse, type NextRequest } from 'next/server';
import { elevenKey, envNames, ensureAudio, exists, publicUrl, storage } from '@/lib/audio/generate';
import { MAX_CHARS_PER_FILE, findFile, loadScripts, resolveFile, storageKey } from '@/lib/audio/scripts';

/**
 * /audio/<file>.mp3, якого немає в public/audio/, переписується сюди (next.config → rewrites.fallback).
 * Файл описаний у src/content/audio/*.json → генеруємо в ElevenLabs один раз, кладемо в Supabase
 * Storage (бакет `audio`, публічний) і перенаправляємо туди. Наступні запити — одразу редирект.
 *
 * /api/audio/_status?lesson=<id> — що описано, що вже згенеровано, чи є ключі (без значень).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const name = params.path.join('/');

  if (name === '_status') {
    const lesson = req.nextUrl.searchParams.get('lesson');
    const files = [];
    for (const s of loadScripts()) {
      if (lesson && s.lesson_id !== lesson) continue;
      for (const n of Object.keys(s.files)) {
        try {
          const f = resolveFile(s, n);
          const key = storageKey(f);
          files.push({ lesson: s.lesson_id, file: n, chars: f.chars, lines: f.clips.length, model: f.model, ready: await exists(key), url: `/audio/${n}` });
        } catch (e) {
          files.push({ lesson: s.lesson_id, file: n, error: String((e as Error).message) });
        }
      }
    }
    return NextResponse.json(
      {
        elevenlabs_key: Boolean(elevenKey()),
        supabase_storage: Boolean(storage()),
        env_names: envNames(/ELEVEN|UNSPLASH/i),
        files,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!/^[a-z0-9][a-z0-9/_-]*\.mp3$/.test(name)) return new NextResponse('Not found', { status: 404 });
  let f;
  try {
    f = findFile(name);
  } catch (e) {
    return new NextResponse(String((e as Error).message), { status: 500 });
  }
  if (!f) return new NextResponse('Not found', { status: 404 });
  if (f.chars > MAX_CHARS_PER_FILE) return new NextResponse('Script too long', { status: 413 });

  try {
    const url = (await exists(storageKey(f))) ? publicUrl(storageKey(f))! : await ensureAudio(f);
    return NextResponse.redirect(url, {
      status: 302,
      // кеш CDN Vercel чиститься при кожному деплої, тож зміна сценарію (новий хеш) підхопиться
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=31536000' },
    });
  } catch (e) {
    console.error('[audio]', name, e);
    return new NextResponse(`Audio is not ready: ${(e as Error).message}`, {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
    });
  }
}

export const HEAD = GET;
