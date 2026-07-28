import { getDb, json, membershipErrorResponse, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureMembershipInfrastructure, transitionMembershipCommand } from '../../../_lib/memberships.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;

  try {
    const { membershipId } = await params;
    const db = await getDb();
    await ensureMembershipInfrastructure(db);
    const membership = await db.collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
    if (!membership) return json({ error: 'Membership not found' }, 404);
    const body = await req.json();
    return json(await transitionMembershipCommand({ db, user: auth.user, membership, body }));
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
