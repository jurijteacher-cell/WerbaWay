import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { fetchTrash, isPendingPurge } from '@/lib/pages/trash';

export const dynamic = 'force-dynamic';

/**
 * GET — лекції, які викладач видалив назавжди, а їхні файли ще лежать у цьому деплої.
 * Читає GitHub Action .github/workflows/purge-lectures.yml і прибирає файли з репо
 * (scripts/purge-lectures.mjs). Лише slug-и — нічого приватного.
 */
export async function GET() {
  const rows = await fetchTrash(createAnonClient());
  const slugs = rows.filter(isPendingPurge).map((r) => r.slug);
  return NextResponse.json({ slugs, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local' });
}
