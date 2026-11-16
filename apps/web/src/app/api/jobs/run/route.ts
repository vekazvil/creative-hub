import { NextResponse, type NextRequest } from 'next/server';

import { processDueJobs } from '@/lib/jobs';

// Retries and anything left in the outbox. Called by Vercel Cron and by the GitHub Actions
// schedule (every 5 minutes, since Hobby cron runs once a day). Needs CRON_SECRET.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const processed = await processDueJobs({ max: 20, budgetMs: 50_000 });
  return NextResponse.json({ processed });
}
