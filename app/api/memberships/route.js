import { getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId } from '../_lib/server.js';
import { createMembershipCommand } from '../_lib/memberships.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;

  const db = await getDb();
  const url = new URL(req.url);
  const query = scopeFor(auth.user);
  const studentId = url.searchParams.get('student_id');
  const programId = url.searchParams.get('program_id');
  const status = url.searchParams.get('status');
  if (studentId) query.student_id = studentId;
  if (programId) query.program_id = programId;
  if (status) query.status = status;

  const items = await db.collection('memberships').find(query).sort({ created_at: -1 }).toArray();
  return json({ items: items.map(stripId) });
}

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    const membership = await createMembershipCommand({ db: await getDb(), user: auth.user, organizationId, body });
    return json(membership, 201);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}
