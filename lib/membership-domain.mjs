export const MEMBERSHIP_STATUSES = Object.freeze([
  'pending',
  'active',
  'paused',
  'completed',
  'inactive',
  'archived',
]);

const TRANSITIONS = Object.freeze({
  pending: new Set(['active', 'inactive', 'archived']),
  active: new Set(['paused', 'completed', 'inactive', 'archived']),
  paused: new Set(['active', 'inactive', 'archived']),
  completed: new Set(['active', 'inactive', 'archived']),
  inactive: new Set(['active', 'archived']),
  archived: new Set(['pending', 'active', 'paused', 'completed', 'inactive']),
});

export function assertMembershipStatus(status) {
  if (!MEMBERSHIP_STATUSES.includes(status)) {
    throw new Error(`Invalid membership status: ${status}`);
  }
  return status;
}

export function assertMembershipTransition(fromStatus, toStatus) {
  assertMembershipStatus(fromStatus);
  assertMembershipStatus(toStatus);
  if (!TRANSITIONS[fromStatus].has(toStatus)) {
    throw new Error(`Membership cannot transition from ${fromStatus} to ${toStatus}`);
  }
}

export function createMembership({ id, organizationId, studentId, programId, status = 'pending', actorId, now, notes = '', metadata = {} }) {
  assertMembershipStatus(status);
  if (!id || !organizationId || !studentId || !programId || !actorId || !now) {
    throw new Error('Membership id, organization, student, program, actor, and timestamp are required');
  }
  return {
    id,
    organization_id: organizationId,
    student_id: studentId,
    program_id: programId,
    status,
    notes,
    metadata,
    created_at: now,
    updated_at: now,
    lifecycle_history: [{
      from_status: null,
      to_status: status,
      reason: 'created',
      changed_by: actorId,
      changed_at: now,
    }],
  };
}

export function transitionMembership(membership, { status, actorId, now, reason = '' }) {
  if (!membership) throw new Error('Membership is required');
  if (!actorId || !now) throw new Error('Actor and timestamp are required');
  assertMembershipTransition(membership.status, status);
  const historyEntry = {
    from_status: membership.status,
    to_status: status,
    reason,
    changed_by: actorId,
    changed_at: now,
    ...(status === 'archived' ? { restorable_status: membership.status } : {}),
  };
  return {
    ...membership,
    status,
    updated_at: now,
    lifecycle_history: [...(membership.lifecycle_history || []), historyEntry],
  };
}
