import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AttendanceDomainError,
  createAttendanceRecord,
  creditDebitFor,
  creditPolicyFor,
} from '../lib/attendance-domain.mjs';
import { ledgerDelta } from '../app/api/_lib/attendance.js';

const participation = {
  id: 'participation-1',
  membership_id: 'membership-1',
  program_offering_id: 'offering-1',
  term_id: 'term-1',
};

const base = {
  id: 'attendance-1',
  organizationId: 'org-1',
  session: { id: 'session-1', term_id: 'term-1', status: 'scheduled' },
  participation,
  actorId: 'user-1',
  now: '2026-07-31T00:00:00.000Z',
};

test('Attendance statuses and configured credit policy are deterministic', () => {
  const policy = creditPolicyFor({ attendance_policy: { credit_consumption_enabled: true, credits_per_attendance: 2 } });
  assert.deepEqual(policy, { enabled: true, quantity: 2 });
  assert.equal(creditDebitFor('present', policy), -2);
  assert.equal(creditDebitFor('late', policy), -2);
  assert.equal(creditDebitFor('absent', policy), 0);
  assert.equal(creditDebitFor('excused', policy), 0);
  assert.equal(creditDebitFor('present', { enabled: false, quantity: 0 }), 0);
});

test('Attendance records are canonical and preserve the referenced Session and Participation', () => {
  const record = createAttendanceRecord({ ...base, input: { status: 'present', notes: 'On time' } });
  assert.equal(record.session_id, 'session-1');
  assert.equal(record.membership_term_participation_id, 'participation-1');
  assert.equal(record.status, 'present');
  assert.equal(record.event_type, 'recorded');
  assert.equal(record.revision, 1);
});

test('Holiday and Cancelled Sessions cannot receive a new Attendance Record', () => {
  for (const sessionStatus of ['holiday', 'cancelled']) {
    assert.throws(
      () => createAttendanceRecord({
        ...base,
        session: { ...base.session, status: sessionStatus },
        input: { status: 'present' },
      }),
      (error) => error instanceof AttendanceDomainError && error.status === 409,
    );
  }
});

test('corrections and voids are append-only events', () => {
  const corrected = createAttendanceRecord({
    ...base,
    id: 'attendance-2',
    input: { status: 'absent', notes: 'Correction' },
    eventType: 'corrected',
    supersedesRecordId: 'attendance-1',
    revision: 2,
  });
  const voided = createAttendanceRecord({
    ...base,
    id: 'attendance-3',
    input: { notes: 'Void' },
    eventType: 'voided',
    supersedesRecordId: 'attendance-2',
    revision: 3,
  });
  assert.equal(corrected.supersedes_record_id, 'attendance-1');
  assert.equal(voided.status, null);
  assert.equal(voided.supersedes_record_id, 'attendance-2');
});


test('Initial Attendance creation handles a missing previous record', () => {
  const offering = {
    attendance_policy: {
      credit_consumption_enabled: true,
      credits_per_attendance: 1,
    },
  };
  const next = { status: 'present' };

  assert.equal(ledgerDelta(null, next, offering), -1);
});
