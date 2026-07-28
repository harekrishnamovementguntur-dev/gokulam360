import { v4 as uuidv4 } from 'uuid';
import { createMembership, transitionMembership } from '../../../lib/membership-domain.mjs';
import { runInTransaction, stripId } from './server.js';

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

export async function createMembershipCommand({ db, user, organizationId, body }) {
  const now = new Date().toISOString();
  const studentId = String(body.student_id || '');
  const programId = String(body.program_id || '');
  if (!studentId || !programId) throw new Error('student_id and program_id are required');

  const [student, program] = await Promise.all([
    db.collection('students').findOne({ id: studentId, organization_id: organizationId, is_deleted: { $ne: true } }),
    db.collection('programs').findOne({ id: programId, organization_id: organizationId, is_deleted: { $ne: true } }),
  ]);
  if (!student) throw new Error('Student not found in this organization');
  if (!program) throw new Error('Program not found in this organization');

  const duplicate = await db.collection('memberships').findOne({
    organization_id: organizationId,
    student_id: studentId,
    program_id: programId,
    status: { $ne: 'archived' },
  });
  if (duplicate) throw new Error('A non-archived Membership already exists for this Student and Program');

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
  if (typeof body.notes !== 'string') throw new Error('notes must be a string');
  if (body.notes.length > 4000) throw new Error('notes must be 4000 characters or fewer');
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
