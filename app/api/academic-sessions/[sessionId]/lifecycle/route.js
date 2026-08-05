import { apiErrorResponse, getDb, json, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureAcademicCalendarInfrastructure, transitionAcademicSession } from '../../../_lib/academic-calendar.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const item = await db.collection('academic_sessions').findOne({ id: (await params).sessionId, ...scopeFor(auth.user) });
    if (!item) return json({ error: 'Session not found' }, 404);
    const body = await req.json();
    return json(await transitionAcademicSession(db, auth.user, item, body.status, { reason: body.reason || '', new_date: body.new_date || null }));
  } catch (error) { return apiErrorResponse(error, 'Academic Session'); }
}
