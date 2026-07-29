import { apiErrorResponse, getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureProgramInfrastructure, updateEntity } from '../../_lib/program-offerings.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const offering = await db.collection('program_offerings').findOne({ id: (await params).offeringId, ...scopeFor(auth.user) });
    return offering ? json(stripId(offering)) : json({ error: 'Program Offering not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Program Offering'); }
}
export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const offering = await db.collection('program_offerings').findOne({ id: (await params).offeringId, ...scopeFor(auth.user) });
    return offering ? json(await updateEntity(db, auth.user, 'program_offerings', offering, await req.json(), 'program_offering')) : json({ error: 'Program Offering not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Program Offering'); }
}