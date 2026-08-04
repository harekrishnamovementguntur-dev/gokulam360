import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStudentCredits } from '../lib/student-credit-summary.mjs';

test('calculates credits given and remaining per student from canonical ledger entries', () => {
  const memberships = [
    { id: 'membership-1', student_id: 'student-1' },
    { id: 'membership-2', student_id: 'student-2' },
  ];
  const entries = [
    { membership_id: 'membership-1', quantity_delta: 16 },
    { membership_id: 'membership-1', quantity_delta: -1 },
    { membership_id: 'membership-2', quantity_delta: 10 },
    { membership_id: 'membership-2', quantity_delta: -3 },
  ];
  const summary = summarizeStudentCredits(memberships, entries);
  assert.deepEqual(summary.get('student-1'), { granted: 16, remaining: 15 });
  assert.deepEqual(summary.get('student-2'), { granted: 10, remaining: 7 });
});
