import { apiErrorResponse, getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureAcademicCalendarInfrastructure, updateAcademicTerm } from '../../_lib/academic-calendar.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const term = await db.collection('academic_terms').findOne({ id: (await params).termId, ...scopeFor(auth.user) });
    return term ? json(stripId(term)) : json({ error: 'Term not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Academic Term'); }
}
export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const term = await db.collection('academic_terms').findOne({ id: (await params).termId, ...scopeFor(auth.user) });
    return term ? json(await updateAcademicTerm(db, auth.user, term, await req.json())) : json({ error: 'Term not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Academic Term'); }
}
