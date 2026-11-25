import { NextResponse } from 'next/server';
import { elevenKey, envKey } from '@/lib/audio/generate';

/**
 * Ops check: which deployment is live and whether the Notion integration is configured.
 * Booleans only — never the key itself.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    env: process.env.VERCEL_ENV ?? 'local',
    notion_key: Boolean(process.env.NOTION_API_KEY || process.env.NOTION_TOKEN || process.env.NotionAPI),
    elevenlabs_key: Boolean(elevenKey()),
    unsplash_key: Boolean(envKey(['UNSPLASH_ACCESS_KEY', 'UNSPLASH_API_KEY', 'UNSPLASH_KEY'], /UNSPLASH/i)),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openai_key: Boolean((process.env.OPENAI_API_KEY ?? process.env.OpenAI_key)?.trim()),
    now: new Date().toISOString(),
  });
}
