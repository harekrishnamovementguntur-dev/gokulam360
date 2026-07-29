import { apiErrorResponse, getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureAcademicCalendarInfrastructure, updateAcademicSession } from '../../_lib/academic-calendar.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const item = await db.collection('academic_sessions').findOne({ id: (await params).sessionId, ...scopeFor(auth.user) });
    return item ? json(stripId(item)) : json({ error: 'Session not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Academic Session'); }
}
export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const item = await db.collection('academic_sessions').findOne({ id: (await params).sessionId, ...scopeFor(auth.user) });
    return item ? json(await updateAcademicSession(db, auth.user, item, await req.json())) : json({ error: 'Session not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Academic Session'); }
}
