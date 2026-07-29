import { apiErrorResponse, getDb, json, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureProgramInfrastructure, transitionEntity } from '../../../_lib/program-offerings.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const offering = await db.collection('program_offerings').findOne({ id: (await params).offeringId, ...scopeFor(auth.user) });
    if (!offering) return json({ error: 'Program Offering not found' }, 404);
    const body = await req.json();
    return json(await transitionEntity(db, auth.user, 'program_offerings', offering, body.status, 'program_offering'));
  } catch (error) { return apiErrorResponse(error, 'Program Offering'); }
}