import { apiErrorResponse, getDb, json, requireUser, scopeFor } from '../../../_lib/server.js';
import { ensureParticipationInfrastructure, transitionParticipationCommand } from '../../../_lib/membership-term-participation.js';

export async function POST(req, { params }) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  try {
    const db = await getDb();
    await ensureParticipationInfrastructure(db);
    const item = await db.collection('membership_term_participations').findOne({
      id: (await params).participationId,
      ...scopeFor(auth.user),
    });
    if (!item) return json({ error: 'Participation not found' }, 404);
    return json(await transitionParticipationCommand({ db, user: auth.user, participation: item, body: await req.json() }));
  } catch (error) {
    return apiErrorResponse(error, 'Membership Term Participation');
  }
}
