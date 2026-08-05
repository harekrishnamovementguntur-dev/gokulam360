import { v4 as uuidv4 } from 'uuid';
import {
  ParticipationDomainError,
  createParticipation,
  transitionParticipation,
} from '../../../lib/membership-term-participation-domain.mjs';
import { runInTransaction, stripId } from './server.js';

let infrastructurePromise;

export async function ensureParticipationInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = Promise.all([
      db.collection('membership_term_participations').createIndexes([
        {
          key: { organization_id: 1, membership_id: 1, term_id: 1 },
          unique: true,
          partialFilterExpression: { status: 'active' },
          name: 'participation_active_membership_term_unique',
        },
        { key: { organization_id: 1, status: 1, created_at: -1 }, name: 'participation_status_created' },
        { key: { organization_id: 1, membership_id: 1, created_at: -1 }, name: 'participation_membership_created' },
        { key: { organization_id: 1, program_offering_id: 1, term_id: 1 }, name: 'participation_offering_term' },
      ]),
    ]).catch((error) => { infrastructurePromise = undefined; throw error; });
  }
  return infrastructurePromise;
}

const audit = (organizationId, user, action, entityId, now, details = {}) => ({
  id: uuidv4(),
  organization_id: organizationId,
  entity_type: 'membership_term_participation',
  entity_id: entityId,
  action,
  actor_id: user.id,
  actor_name: user.name || '',
  details,
  created_at: now,
});

const outbox = (organizationId, eventType, participation, now, details = {}) => ({
  id: uuidv4(),
  organization_id: organizationId,
  aggregate_type: 'membership_term_participation',
  aggregate_id: participation.id,
  event_type: eventType,
  payload: {
    participation_id: participation.id,
    membership_id: participation.membership_id,
    program_offering_id: participation.program_offering_id,
    term_id: participation.term_id,
    status: participation.status,
    ...details,
  },
  status: 'pending',
  occurred_at: now,
  created_at: now,
});

async function validateReferences(db, organizationId, input) {
  const membership = await db.collection('memberships').findOne({
    id: input.membership_id,
    organization_id: organizationId,
    status: 'active',
  });
  if (!membership) throw new ParticipationDomainError('An Active Membership is required', 422);

  const offering = await db.collection('program_offerings').findOne({
    id: input.program_offering_id,
    organization_id: organizationId,
    status: { $ne: 'archived' },
  });
  if (!offering) throw new ParticipationDomainError('Program Offering not found in this organization', 404);
  if (offering.program_id !== membership.program_id) {
    throw new ParticipationDomainError('Program Offering does not belong to the Membership Program', 422);
  }

  const term = await db.collection('academic_terms').findOne({
    id: input.term_id,
    organization_id: organizationId,
    program_offering_id: offering.id,
    status: { $ne: 'archived' },
  });
  if (!term) throw new ParticipationDomainError('Term does not belong to the selected Program Offering', 422);

  return { membership, offering, term };
}

async function writeMutation(db, user, participation, action, details = {}) {
  const now = new Date().toISOString();
  await runInTransaction(db, async (session) => {
    if (action === 'participation.created') {
      await db.collection('membership_term_participations').insertOne(participation, { session });
    } else {
      await db.collection('membership_term_participations').replaceOne(
        { id: participation.id, organization_id: participation.organization_id },
        participation,
        { session },
      );
    }
    await db.collection('audit_logs').insertOne(
      audit(participation.organization_id, user, action, participation.id, now, details),
      { session },
    );
    await db.collection('outbox_events').insertOne(
      outbox(participation.organization_id, action, participation, now, details),
      { session },
    );
  });
  return stripId(participation);
}

export async function createParticipationCommand({ db, user, organizationId, body }) {
  const input = {
    membership_id: String(body.membership_id || ''),
    program_offering_id: String(body.program_offering_id || ''),
    term_id: String(body.term_id || ''),
  };
  const references = await validateReferences(db, organizationId, input);
  const duplicate = await db.collection('membership_term_participations').findOne({
    organization_id: organizationId,
    membership_id: input.membership_id,
    term_id: input.term_id,
    status: 'active',
  });
  if (duplicate) throw new ParticipationDomainError('An Active Participation already exists for this Membership and Term', 409);
  const now = new Date().toISOString();
  const participation = createParticipation({
    id: uuidv4(),
    organizationId,
    membershipId: input.membership_id,
    programOfferingId: references.offering.id,
    termId: references.term.id,
    actorId: user.id,
    now,
  });
  return writeMutation(db, user, participation, 'participation.created', {
    student_id: references.membership.student_id,
  });
}

export async function transitionParticipationCommand({ db, user, participation, body }) {
  const status = body.status === 'restore' ? 'active' : body.status;
  const now = new Date().toISOString();
  const updated = transitionParticipation(participation, {
    status,
    actorId: user.id,
    now,
    reason: typeof body.reason === 'string' ? body.reason : '',
  });
  return writeMutation(db, user, updated, status === 'active' && participation.status === 'archived' ? 'participation.restored' : 'participation.status_changed', {
    reason: typeof body.reason === 'string' ? body.reason : '',
  });
}
