import { apiErrorResponse, getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId } from '../_lib/server.js';
import { createLegacyProgramMapping, ensureProgramInfrastructure } from '../_lib/program-offerings.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const items = await db.collection('migration_mappings').find({ ...scopeFor(auth.user), mapping_type: 'legacy_program_to_program_offering' }).sort({ created_at: -1 }).toArray();
    return json({ items: items.map(stripId) });
  } catch (error) { return apiErrorResponse(error, 'Migration mapping'); }
}
export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const body = await req.json(); const db = await getDb(); await ensureProgramInfrastructure(db);
    return json(await createLegacyProgramMapping(db, auth.user, resolveOrganizationId(auth.user, body.organization_id), body), 201);
  } catch (error) { return apiErrorResponse(error, 'Migration mapping'); }
}