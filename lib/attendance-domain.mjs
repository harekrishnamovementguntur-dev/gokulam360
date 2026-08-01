export const ATTENDANCE_STATUSES = Object.freeze(['present', 'late', 'absent', 'excused']);
export const ATTENDANCE_EVENT_TYPES = Object.freeze(['recorded', 'corrected', 'voided']);

export class AttendanceDomainError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'AttendanceDomainError';
    this.status = status;
  }
}

const history = (type, actorId, now, details = {}) => ({
  type,
  changed_by: actorId,
  changed_at: now,
  ...details,
});

const text = (value, field) => {
  const result = String(value ?? '').trim();
  if (!result) throw new AttendanceDomainError(field + ' is required');
  return result;
};

const status = (value) => {
  if (!ATTENDANCE_STATUSES.includes(value)) {
    throw new AttendanceDomainError('Invalid attendance status: ' + value);
  }
  return value;
};

const notes = (value) => String(value ?? '').trim();

export function creditPolicyFor(offering) {
  const policy = offering?.attendance_policy || offering?.metadata?.attendance_policy || {};
  const enabled = policy.credit_consumption_enabled === true;
  if (!enabled) return { enabled: false, quantity: 0 };
  const quantity = Number(policy.credits_per_attendance ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AttendanceDomainError('credits_per_attendance must be a positive integer');
  }
  return { enabled: true, quantity };
}

export function creditDebitFor(attendanceStatus, policy) {
  if (!policy?.enabled) return 0;
  return attendanceStatus === 'present' || attendanceStatus === 'late'
    ? -policy.quantity
    : 0;
}

export function createAttendanceRecord({
  id,
  organizationId,
  session,
  participation,
  input,
  actorId,
  now,
  eventType = 'recorded',
  supersedesRecordId = null,
  revision = 1,
}) {
  if (!id || !organizationId || !actorId || !now) {
    throw new AttendanceDomainError('Attendance record identity is incomplete');
  }
  if (!session?.id || !participation?.id) {
    throw new AttendanceDomainError('Session and Membership Term Participation are required');
  }
  if (session.term_id !== participation.term_id) {
    throw new AttendanceDomainError('Session and Participation must belong to the same Term');
  }
  if (eventType === 'recorded' && ['holiday', 'cancelled'].includes(session.status)) {
    throw new AttendanceDomainError('Attendance cannot be recorded for a Holiday or Cancelled Session', 409);
  }
  if (!ATTENDANCE_EVENT_TYPES.includes(eventType)) {
    throw new AttendanceDomainError('Invalid attendance event type');
  }
  if (!Number.isInteger(revision) || revision < 1) {
    throw new AttendanceDomainError('Attendance revision must be a positive integer');
  }

  const attendanceStatus = eventType === 'voided' ? null : status(input?.status);
  return {
    id,
    organization_id: organizationId,
    session_id: session.id,
    membership_term_participation_id: participation.id,
    membership_id: participation.membership_id,
    program_offering_id: participation.program_offering_id,
    term_id: participation.term_id,
    status: attendanceStatus,
    event_type: eventType,
    supersedes_record_id: supersedesRecordId,
    revision,
    notes: notes(input?.notes),
    recorded_by: actorId,
    recorded_at: now,
    created_at: now,
  };
}

export function correctionInput(body) {
  return {
    status: status(body?.status),
    notes: notes(body?.notes),
  };
}

export function voidInput(body) {
  return { notes: notes(body?.notes) };
}

export function attendanceHistory(record, actorId, now, eventType) {
  return {
    ...(record.history || {}),
    ...history(eventType, actorId, now),
  };
}
