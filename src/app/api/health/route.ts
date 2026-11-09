import { NextResponse } from 'next/server';

/**
 * Ops check: which deployment is live and whether the Notion integration is configured.
 * Booleans only — never the key itself.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    env: process.env.VERCEL_ENV ?? 'local',
    notion_key: Boolean(process.env.NOTION_API_KEY || process.env.NOTION_TOKEN),
    now: new Date().toISOString(),
  });
}
