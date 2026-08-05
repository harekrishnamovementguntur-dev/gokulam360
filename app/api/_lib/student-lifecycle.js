import { v4 as uuidv4 } from 'uuid';
import { transitionMembership } from '../../../lib/membership-domain.mjs';
import { transitionParticipation } from '../../../lib/membership-term-participation-domain.mjs';
import { runInTransaction, stripId } from './server.js';

export class StudentLifecycleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'StudentLifecycleError';
    this.status = status;
  }
}

const audit = (organizationId, user, entityType, entityId, action, now, details = {}) => ({
  id: uuidv4(),
  organization_id: organizationId,
  entity_type: entityType,
  entity_id: entityId,
  action,
  actor_id: user.id,
  actor_name: user.name || '',
  details,
  created_at: now,
});

const outbox = (organizationId, aggregateType, aggregateId, eventType, now, payload = {}) => ({
  id: uuidv4(),
  organization_id: organizationId,
  aggregate_type: aggregateType,
  aggregate_id: aggregateId,
  event_type: eventType,
  payload,
  status: 'pending',
  occurred_at: now,
  created_at: now,
});

function appendLifecycleHistory(document, entry) {
  return {
    ...document,
    lifecycle_history: [...(document.lifecycle_history || []), entry],
    updated_at: entry.changed_at,
  };
}

export async function archiveStudentCommand({ db, user, organizationId, studentId }) {
  if (!studentId || !organizationId) {
    throw new StudentLifecycleError('Student and organization are required', 422);
  }

  return runInTransaction(db, async (session) => {
    const students = db.collection('students');
    const memberships = db.collection('memberships');
    const participations = db.collection('membership_term_participations');
    const auditLogs = db.collection('audit_logs');
    const outboxEvents = db.collection('outbox_events');

    const student = await students.findOne(
      { id: studentId, organization_id: organizationId },
      { session },
    );
    if (!student) throw new StudentLifecycleError('Student not found', 404);

    const studentMemberships = await memberships.find(
      { organization_id: organizationId, student_id: studentId },
      { session },
    ).sort({ created_at: 1 }).toArray();
    const activeMemberships = studentMemberships.filter((membership) => membership.status === 'active');
    const membershipIds = studentMemberships.map((membership) => membership.id);
    const activeParticipations = membershipIds.length
      ? await participations.find(
          { organization_id: organizationId, membership_id: { $in: membershipIds }, status: 'active' },
          { session },
        ).sort({ created_at: 1 }).toArray()
      : [];

    const alreadyArchived = student.is_deleted === true || student.status === 'archived';
    if (alreadyArchived && activeMemberships.length === 0 && activeParticipations.length === 0) {
      return {
        ok: true,
        archived: true,
        already_archived: true,
        student_id: studentId,
        membership_count: 0,
        participation_count: 0,
      };
    }

    const now = new Date().toISOString();
    const reason = 'student_archived';
    const studentHistory = {
      from_status: student.status || (student.is_deleted ? 'active' : null),
      to_status: 'archived',
      reason,
      changed_by: user.id,
      changed_at: now,
    };
    const archivedStudent = appendLifecycleHistory(
      { ...student, is_deleted: true, status: 'archived' },
      studentHistory,
    );

    await students.replaceOne({ _id: student._id }, archivedStudent, { session });
    await auditLogs.insertOne(
      audit(organizationId, user, 'student', studentId, 'student.archived', now, {
        membership_count: activeMemberships.length,
        participation_count: activeParticipations.length,
      }),
      { session },
    );
    await outboxEvents.insertOne(
      outbox(organizationId, 'student', studentId, 'student.archived', now, {
        student_id: studentId,
        membership_count: activeMemberships.length,
        participation_count: activeParticipations.length,
      }),
      { session },
    );

    for (const membership of activeMemberships) {
      const updatedMembership = transitionMembership(membership, {
        status: 'inactive',
        actorId: user.id,
        now,
        reason,
      });
      await memberships.replaceOne(
        { _id: membership._id },
        updatedMembership,
        { session },
      );
      await auditLogs.insertOne(
        audit(organizationId, user, 'membership', membership.id, 'membership.status_changed', now, {
          student_id: studentId,
          from_status: membership.status,
          to_status: 'inactive',
          reason,
        }),
        { session },
      );
      await outboxEvents.insertOne(
        outbox(organizationId, 'membership', membership.id, 'membership.status_changed', now, {
          membership_id: membership.id,
          student_id: studentId,
          from_status: membership.status,
          to_status: 'inactive',
          reason,
        }),
        { session },
      );
    }

    for (const participation of activeParticipations) {
      const updatedParticipation = transitionParticipation(participation, {
        status: 'withdrawn',
        actorId: user.id,
        now,
        reason,
      });
      await participations.replaceOne(
        { _id: participation._id },
        updatedParticipation,
        { session },
      );
      await auditLogs.insertOne(
        audit(organizationId, user, 'membership_term_participation', participation.id, 'participation.status_changed', now, {
          student_id: studentId,
          membership_id: participation.membership_id,
          from_status: participation.status,
          to_status: 'withdrawn',
          reason,
        }),
        { session },
      );
      await outboxEvents.insertOne(
        outbox(organizationId, 'membership_term_participation', participation.id, 'participation.status_changed', now, {
          participation_id: participation.id,
          student_id: studentId,
          membership_id: participation.membership_id,
          from_status: participation.status,
          to_status: 'withdrawn',
          reason,
        }),
        { session },
      );
    }

    return stripId({
      ok: true,
      archived: true,
      already_archived: false,
      student_id: studentId,
      membership_count: activeMemberships.length,
      participation_count: activeParticipations.length,
      participation_transition: 'withdrawn',
    });
  });
}
