import { v4 as uuidv4 } from 'uuid';
import { MembershipDomainError, createMembership, transitionMembership } from '../../../lib/membership-domain.mjs';
import { runInTransaction, stripId } from './server.js';
import { ensureIndexByKey } from '../../../lib/mongo-indexes.mjs';

let infrastructurePromise;

function auditDocument({ organizationId, actor, action, membershipId, now, details }) {
  return {
    id: uuidv4(),
    organization_id: organizationId,
    entity_type: 'membership',
    entity_id: membershipId,
    action,
    actor_id: actor.id,
    actor_name: actor.name || '',
    details,
    created_at: now,
  };
}

function outboxDocument({ organizationId, type, membership, now }) {
  return {
    id: uuidv4(),
    organization_id: organizationId,
    aggregate_type: 'membership',
    aggregate_id: membership.id,
    event_type: type,
    payload: {
      membership_id: membership.id,
      student_id: membership.student_id,
      program_id: membership.program_id,
      status: membership.status,
    },
    status: 'pending',
    occurred_at: now,
    created_at: now,
  };
}

async function provisionMembershipInfrastructure(db) {
  const memberships = db.collection('memberships');
  await memberships.updateMany(
    { status: 'archived', current_marker: { $exists: true } },
    { $unset: { current_marker: '' } },
  );
  await memberships.updateMany(
    { status: { $ne: 'archived' }, current_marker: { $exists: false } },
    { $set: { current_marker: true } },
  );

  await Promise.all([
    memberships.createIndexes([
      {
        key: { organization_id: 1, student_id: 1, program_id: 1 },
        name: 'memberships_current_relationship_unique',
        unique: true,
        partialFilterExpression: { current_marker: true },
      },
      { key: { organization_id: 1, created_at: -1 }, name: 'memberships_by_organization_created' },
      { key: { organization_id: 1, student_id: 1, created_at: -1 }, name: 'memberships_by_student_created' },
      { key: { organization_id: 1, program_id: 1, status: 1, created_at: -1 }, name: 'memberships_by_program_status_created' },
    ]),
    ensureIndexByKey(
      db.collection('audit_logs'),
      { organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 },
      { name: 'audit_logs_by_membership_entity' },
    ),
    db.collection('outbox_events').createIndex(
      { status: 1, occurred_at: 1 },
      { name: 'outbox_events_by_delivery_status' },
    ),
  ]);
}

export async function ensureMembershipInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = provisionMembershipInfrastructure(db).catch(error => {
      infrastructurePromise = undefined;
      throw error;
    });
  }
  return infrastructurePromise;
}

export async function createMembershipCommand({ db, user, organizationId, body }) {
  const now = new Date().toISOString();
  const studentId = String(body.student_id || '');
  const programId = String(body.program_id || '');
  if (!studentId || !programId) throw new MembershipDomainError('student_id and program_id are required');

  const [student, program] = await Promise.all([
    db.collection('students').findOne({ id: studentId, organization_id: organizationId, is_deleted: { $ne: true } }),
    db.collection('academic_programs').findOne({ id: programId, organization_id: organizationId, status: { $ne: 'archived' } }),
  ]);
  if (!student) throw new MembershipDomainError('Student not found in this organization', 404);
  if (!program) throw new MembershipDomainError('Program not found in this organization', 404);

  const duplicate = await db.collection('memberships').findOne({
    organization_id: organizationId,
    student_id: studentId,
    program_id: programId,
    current_marker: true,
  });
  if (duplicate) throw new MembershipDomainError('A non-archived Membership already exists for this Student and Program', 409);

  const membership = createMembership({
    id: uuidv4(),
    organizationId,
    studentId,
    programId,
    status: body.status || 'pending',
    actorId: user.id,
    now,
    notes: typeof body.notes === 'string' ? body.notes : '',
    metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {},
  });

  await runInTransaction(db, async session => {
    await db.collection('memberships').insertOne(membership, { session });
    await db.collection('audit_logs').insertOne(auditDocument({
      organizationId, actor: user, action: 'membership.created', membershipId: membership.id, now,
      details: { student_id: studentId, program_id: programId, status: membership.status },
    }), { session });
    await db.collection('outbox_events').insertOne(outboxDocument({
      organizationId, type: 'membership.created', membership, now,
    }), { session });
  });
  return stripId(membership);
}

export async function updateMembershipCommand({ db, user, membership, body }) {
  if (typeof body.notes !== 'string') throw new MembershipDomainError('notes must be a string');
  if (body.notes.length > 4000) throw new MembershipDomainError('notes must be 4000 characters or fewer');
  const now = new Date().toISOString();
  const updated = { ...membership, notes: body.notes, updated_at: now };

  await runInTransaction(db, async session => {
    await db.collection('memberships').replaceOne({ id: membership.id, organization_id: membership.organization_id }, updated, { session });
    await db.collection('audit_logs').insertOne(auditDocument({
      organizationId: membership.organization_id, actor: user, action: 'membership.updated',
      membershipId: membership.id, now, details: { updated_fields: ['notes'] },
    }), { session });
    await db.collection('outbox_events').insertOne(outboxDocument({
      organizationId: membership.organization_id, type: 'membership.updated', membership: updated, now,
    }), { session });
  });
  return stripId(updated);
}

export async function transitionMembershipCommand({ db, user, membership, body }) {
  const now = new Date().toISOString();
  const updated = transitionMembership(membership, {
    status: body.status,
    actorId: user.id,
    now,
    reason: typeof body.reason === 'string' ? body.reason : '',
  });
  if (membership.status === 'archived') {
    const existing = await db.collection('memberships').findOne({
      organization_id: membership.organization_id,
      student_id: membership.student_id,
      program_id: membership.program_id,
      id: { $ne: membership.id },
      current_marker: true,
    });
    if (existing) throw new MembershipDomainError('Cannot restore while another non-archived Membership exists for this Student and Program', 409);
  }

  await runInTransaction(db, async session => {
    await db.collection('memberships').replaceOne({ id: membership.id, organization_id: membership.organization_id }, updated, { session });
    await db.collection('audit_logs').insertOne(auditDocument({
      organizationId: membership.organization_id, actor: user, action: 'membership.status_changed',
      membershipId: membership.id, now, details: { from_status: membership.status, to_status: updated.status, reason: body.reason || '' },
    }), { session });
    await db.collection('outbox_events').insertOne(outboxDocument({
      organizationId: membership.organization_id, type: 'membership.status_changed', membership: updated, now,
    }), { session });
  });
  return stripId(updated);
}
