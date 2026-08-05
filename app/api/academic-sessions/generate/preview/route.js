import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId } from '../../../_lib/server.js';
import { ensureAcademicCalendarInfrastructure, previewAcademicSessionGeneration } from '../../../_lib/academic-calendar.js';

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); await ensureAcademicCalendarInfrastructure(db);
    return json(await previewAcademicSessionGeneration(db, resolveOrganizationId(auth.user, body.organization_id), body));
  } catch (error) { return apiErrorResponse(error, 'Session Generation Preview'); }
}
