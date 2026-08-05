import { apiErrorResponse, getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureProgramInfrastructure, updateEntity } from '../../_lib/program-offerings.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const program = await db.collection('academic_programs').findOne({ id: (await params).programId, ...scopeFor(auth.user) });
    return program ? json(stripId(program)) : json({ error: 'Program not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Program'); }
}
export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']); if (auth.error) return auth.error;
  try {
    const db = await getDb(); await ensureProgramInfrastructure(db);
    const program = await db.collection('academic_programs').findOne({ id: (await params).programId, ...scopeFor(auth.user) });
    return program ? json(await updateEntity(db, auth.user, 'academic_programs', program, await req.json(), 'program')) : json({ error: 'Program not found' }, 404);
  } catch (error) { return apiErrorResponse(error, 'Program'); }
}