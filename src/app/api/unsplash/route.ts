import { NextResponse, type NextRequest } from 'next/server';
import { envKey } from '@/lib/audio/generate';

/**
 * Пошук фото для лекцій через Unsplash API (ключ — у змінних Vercel).
 *   /api/unsplash?q=train+mountains&n=8            → кандидати: id, alt, автор, розмір, лайки, адреса для сторінки
 *   /api/unsplash?id=<photo_id>                     → одне фото (перевірити alt, автора, орієнтацію)
 *   /api/unsplash?track=<photo_id>                  → «download» за правилами Unsplash API, коли фото пішло в лекцію
 * Відповідь — лише публічні дані фото; ключ не віддається.
 */
export const runtime = 'nodejs';

const key = () =>
  envKey(['UNSPLASH_ACCESS_KEY', 'UNSPLASH_API_KEY', 'UNSPLASH_KEY', 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'Unsplash'], /^(?!.*SECRET).*UNSPLASH/i);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function slim(p: any) {
  const base = String(p.urls?.raw ?? '').split('?')[0];
  return {
    id: p.id,
    alt: p.alt_description ?? null,
    description: p.description ?? null,
    author: p.user?.name ?? null,
    author_url: p.user?.links?.html ? `${p.user.links.html}?utm_source=werba_way&utm_medium=referral` : null,
    width: p.width,
    height: p.height,
    landscape: p.width > p.height,
    likes: p.likes,
    page: p.links?.html ?? null,
    // формати, які ставимо в лекцію (обкладинка / фото в тексті)
    cover: base ? `${base}?w=1600&h=900&fit=crop&q=80&fm=jpg` : null,
    inline: base ? `${base}?w=1400&q=80&fm=jpg&fit=max` : null,
  };
}

export async function GET(req: NextRequest) {
  const raw = key();
  if (!raw) return NextResponse.json({ error: 'UNSPLASH key is not configured' }, { status: 503 });
  // значення могли вставити як «Client-ID …», у лапках або з назвою — беремо сам ключ
  const k = raw.replace(/^["']|["']$/g, '').replace(/^Client-ID\s+/i, '').replace(/^[A-Z_]+\s*=\s*/i, '').trim();
  if (req.nextUrl.searchParams.has('diag')) {
    // форма ключа без самого ключа: чи схоже на Access Key (43 знаки, A–Z a–z 0–9 - _)
    return NextResponse.json({
      length: k.length,
      digits_only: /^\d+$/.test(k),
      access_key_shape: /^[A-Za-z0-9_-]{40,50}$/.test(k),
      has_space: /\s/.test(k),
    });
  }
  const sp = req.nextUrl.searchParams;
  const headers = { Authorization: `Client-ID ${k}`, 'Accept-Version': 'v1' };
  const api = 'https://api.unsplash.com';

  const track = sp.get('track');
  if (track) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(track)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    const r = await fetch(`${api}/photos/${track}/download`, { headers, cache: 'no-store' });
    return NextResponse.json({ ok: r.ok, status: r.status }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const id = sp.get('id');
  if (id) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    const r = await fetch(`${api}/photos/${id}`, { headers, next: { revalidate: 86400 } });
    if (!r.ok) return NextResponse.json({ error: `unsplash ${r.status}` }, { status: r.status });
    return NextResponse.json(slim(await r.json()));
  }

  const q = (sp.get('q') ?? '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });
  const n = Math.min(Math.max(Number(sp.get('n') ?? 8) || 8, 1), 20);
  const orientation = sp.get('orientation') ?? 'landscape';
  const url = `${api}/search/photos?query=${encodeURIComponent(q)}&per_page=${n}&orientation=${encodeURIComponent(orientation)}&content_filter=high`;
  const r = await fetch(url, { headers, next: { revalidate: 86400 } });
  if (!r.ok) return NextResponse.json({ error: `unsplash ${r.status}` }, { status: r.status });
  const data = await r.json();
  return NextResponse.json({ total: data.total, results: (data.results ?? []).map(slim) });
}
