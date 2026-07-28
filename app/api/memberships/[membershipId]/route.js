import { getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  const { membershipId } = await params;
  const membership = await (await getDb()).collection('memberships').findOne({ id: membershipId, ...scopeFor(auth.user) });
  if (!membership) return json({ error: 'Membership not found' }, 404);
  return json(stripId(membership));
}
