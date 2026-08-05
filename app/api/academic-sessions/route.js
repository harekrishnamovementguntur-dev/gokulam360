import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId } from '../_lib/server.js';
import { createAcademicSession, ensureAcademicCalendarInfrastructure } from '../_lib/academic-calendar.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const filter = { ...scopeFor(auth.user) };
    const termId = new URL(req.url).searchParams.get('term_id');
    if (termId) filter.term_id = termId;
    const items = await db.collection('academic_sessions').find(filter).sort({ date: 1, session_number: 1 }).toArray();
    return json({ items: items.map(stripId) });
  } catch (error) { return apiErrorResponse(error, 'Academic Sessions'); }
}
export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    return json(await createAcademicSession(db, auth.user, resolveOrganizationId(auth.user, body.organization_id), body), 201);
  } catch (error) { return apiErrorResponse(error, 'Academic Sessions'); }
}
