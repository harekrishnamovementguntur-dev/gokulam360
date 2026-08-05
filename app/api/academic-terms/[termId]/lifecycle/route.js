import { apiErrorResponse, getDb, json, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureAcademicCalendarInfrastructure, transitionAcademicTerm } from '../../../_lib/academic-calendar.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    const term = await db.collection('academic_terms').findOne({ id: (await params).termId, ...scopeFor(auth.user) });
    if (!term) return json({ error: 'Term not found' }, 404);
    return json(await transitionAcademicTerm(db, auth.user, term, (await req.json()).status));
  } catch (error) { return apiErrorResponse(error, 'Academic Term'); }
}
