import { NextResponse } from 'next/server';
import { getDb } from '../_lib/server.js';
import { logger } from '../_lib/logger.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const missing = ['MONGO_URL', 'JWT_SECRET'].filter((name) => !process.env[name]);

  if (missing.length) {
    logger.warn('readiness.configuration_missing', { missing });
    return NextResponse.json({
      ok: false,
      status: 'not_ready',
      checks: { configuration: 'failed', database: 'not_checked' },
    }, { status: 503 });
  }

  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    return NextResponse.json({
      ok: true,
      status: 'ready',
      checks: { configuration: 'ok', database: 'ok' },
    });
  } catch (error) {
    logger.error('readiness.database_failed', error);
    return NextResponse.json({
      ok: false,
      status: 'not_ready',
      checks: { configuration: 'ok', database: 'failed' },
    }, { status: 503 });
  }
}
