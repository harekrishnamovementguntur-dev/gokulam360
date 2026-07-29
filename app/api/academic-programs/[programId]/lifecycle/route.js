import { apiErrorResponse, getDb, json, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureProgramInfrastructure, transitionEntity } from '../../../_lib/program-offerings.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const program = await db.collection('academic_programs').findOne({ id: (await params).programId, ...scopeFor(auth.user) });
    if (!program) return json({ error: 'Program not found' }, 404);
    const body = await req.json();
    return json(await transitionEntity(db, auth.user, 'academic_programs', program, body.status, 'program'));
  } catch (error) { return apiErrorResponse(error, 'Program'); }
}