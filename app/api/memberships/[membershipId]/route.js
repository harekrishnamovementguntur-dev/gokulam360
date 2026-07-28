import { getDb, json, membershipErrorResponse, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureMembershipInfrastructure, updateMembershipCommand } from '../../_lib/memberships.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;

  try {
    const { membershipId } = await params;
    const db = await getDb();
    await ensureMembershipInfrastructure(db);
    const membership = await db.collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
    if (!membership) return json({ error: 'Membership not found' }, 404);
    return json(stripId(membership));
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;

  try {
    const { membershipId } = await params;
    const db = await getDb();
    await ensureMembershipInfrastructure(db);
    const membership = await db.collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
    if (!membership) return json({ error: 'Membership not found' }, 404);
    return json(await updateMembershipCommand({ db, user: auth.user, membership, body: await req.json() }));
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
