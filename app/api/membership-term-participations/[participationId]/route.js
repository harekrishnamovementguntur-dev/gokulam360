import { apiErrorResponse, getDb, json, requireUser, scopeFor, stripId } from '../../_lib/server.js';
import { ensureParticipationInfrastructure, transitionParticipationCommand } from '../../_lib/membership-term-participation.js';

export async function GET(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureParticipationInfrastructure(db);
    const item = await db.collection('membership_term_participations').findOne({
      id: (await params).participationId,
      ...scopeFor(auth.user),
    });
    return item ? json(stripId(item)) : json({ error: 'Participation not found' }, 404);
  } catch (error) {
    return apiErrorResponse(error, 'Membership Term Participation');
  }
}
