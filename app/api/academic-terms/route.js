import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId } from '../_lib/server.js';
import { createAcademicTerm, ensureAcademicCalendarInfrastructure } from '../_lib/academic-calendar.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const items = await db.collection('academic_terms').find(scopeFor(auth.user)).sort({ display_order: 1, start_date: 1 }).toArray();
    return json({ items: items.map(stripId) });
  } catch (error) { return apiErrorResponse(error, 'Academic Terms'); }
}
export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    return json(await createAcademicTerm(db, auth.user, resolveOrganizationId(auth.user, body.organization_id), body), 201);
  } catch (error) { return apiErrorResponse(error, 'Academic Terms'); }
}
