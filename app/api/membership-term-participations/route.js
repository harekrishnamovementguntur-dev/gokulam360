import { getDb, json, requireUser, resolveOrganizationId, scopeFor, stripId, apiErrorResponse } from '../_lib/server.js';
import { ensureParticipationInfrastructure, createParticipationCommand } from '../_lib/membership-term-participation.js';

export async function GET(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureParticipationInfrastructure(db);
    const url = new URL(req.url);
    const filter = { ...scopeFor(auth.user) };
    for (const key of ['membership_id', 'program_offering_id', 'term_id', 'status']) {
      const value = url.searchParams.get(key);
      if (value) filter[key] = value;
    }
    const studentId = url.searchParams.get('student_id');
    if (studentId) {
      const memberships = await db.collection('memberships').find({ ...scopeFor(auth.user), student_id: studentId }).project({ id: 1 }).toArray();
      filter.membership_id = { $in: memberships.map((item) => item.id) };
    }
    const items = await db.collection('membership_term_participations').find(filter).sort({ created_at: -1 }).toArray();
    return json({ items: items.map(stripId) });
  } catch (error) {
    return apiErrorResponse(error, 'Membership Term Participation');
  }
}

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureParticipationInfrastructure(db);
    const body = await req.json();
    return json(await createParticipationCommand({
      db,
      user: auth.user,
      organizationId: resolveOrganizationId(auth.user, body.organization_id),
      body,
    }), 201);
  } catch (error) {
    if (error?.code === 11000) return json({ error: 'An Active Participation already exists for this Membership and Term' }, 409);
    return apiErrorResponse(error, 'Membership Term Participation');
  }
}
