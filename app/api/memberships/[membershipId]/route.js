import { getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { updateMembershipCommand } from '../../_lib/memberships.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  const { membershipId } = await params;
  const membership = await (await getDb()).collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
  if (!membership) return json({ error: 'Membership not found' }, 404);
  return json(stripId(membership));
}

export async function PUT(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const { membershipId } = await params;
    const db = await getDb();
    const membership = await db.collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
    if (!membership) return json({ error: 'Membership not found' }, 404);
    return json(await updateMembershipCommand({ db, user: auth.user, membership, body: await req.json() }));
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}
