export const PARTICIPATION_STATUSES = Object.freeze(['active', 'completed', 'withdrawn', 'archived']);

export class ParticipationDomainError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'ParticipationDomainError';
    this.status = status;
  }
}

const transitions = Object.freeze({
  active: new Set(['completed', 'withdrawn', 'archived']),
  completed: new Set(['archived']),
  withdrawn: new Set(['active', 'archived']),
  archived: new Set(['active', 'completed', 'withdrawn']),
});

export function assertParticipationStatus(status) {
  if (!PARTICIPATION_STATUSES.includes(status)) {
    throw new ParticipationDomainError('Invalid participation status: ' + status);
  }
  return status;
}

const required = (value, field) => {
  const result = String(value ?? '').trim();
  if (!result) throw new ParticipationDomainError(field + ' is required');
  return result;
};

export function createParticipation({ id, organizationId, membershipId, programOfferingId, termId, actorId, now }) {
  if (!id || !organizationId || !actorId || !now) {
    throw new ParticipationDomainError('Participation identity and audit fields are required');
  }
  return {
    id,
    organization_id: organizationId,
    membership_id: required(membershipId, 'membership_id'),
    program_offering_id: required(programOfferingId, 'program_offering_id'),
    term_id: required(termId, 'term_id'),
    status: 'active',
    created_at: now,
    updated_at: now,
    lifecycle_history: [{
      from_status: null,
      to_status: 'active',
      reason: 'created',
      changed_by: actorId,
      changed_at: now,
    }],
  };
}

export function transitionParticipation(participation, { status, actorId, now, reason = '' }) {
  if (!participation) throw new ParticipationDomainError('Participation is required');
  if (!actorId || !now) throw new ParticipationDomainError('Actor and timestamp are required');
  assertParticipationStatus(status);
  if (participation.status === status) throw new ParticipationDomainError('Status is unchanged');
  if (!transitions[participation.status]?.has(status)) {
    throw new ParticipationDomainError('Participation cannot transition from ' + participation.status + ' to ' + status);
  }
  const history = {
    from_status: participation.status,
    to_status: status,
    reason,
    changed_by: actorId,
    changed_at: now,
    ...(status === 'archived' ? { restorable_status: participation.status } : {}),
  };
  return {
    ...participation,
    status,
    updated_at: now,
    lifecycle_history: [...(participation.lifecycle_history || []), history],
  };
}
