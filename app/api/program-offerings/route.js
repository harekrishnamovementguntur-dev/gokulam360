import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId } from '../_lib/server.js';
import { createOffering, ensureProgramInfrastructure } from '../_lib/program-offerings.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    return json({ items: (await db.collection('program_offerings').find(scopeFor(auth.user)).sort({ start_date: -1 }).toArray()).map(stripId) });
  } catch (error) { return apiErrorResponse(error, 'Program Offering'); }
}
export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); await ensureProgramInfrastructure(db);
    return json(await createOffering(db, auth.user, resolveOrganizationId(auth.user, body.organization_id), body), 201);
  } catch (error) { return apiErrorResponse(error, 'Program Offering'); }
}