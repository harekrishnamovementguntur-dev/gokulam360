import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAdmissionCredits } from '../lib/admission-credit-policy.mjs';

const sessions = [
  { date: '2026-01-04', status: 'completed' },
  { date: '2026-01-11', status: 'completed' },
  { date: '2026-01-18', status: 'scheduled' },
  { date: '2026-01-25', status: 'scheduled' },
  { date: '2026-02-01', status: 'holiday' },
  { date: '2026-02-08', status: 'scheduled' },
];

test('remaining policy excludes holidays and completed sessions', () => {
  assert.deepEqual(calculateAdmissionCredits({ sessions, policy: 'remaining', asOf: '2026-01-20' }), {
    fullCredits: 5,
    completedSessions: 2,
    remainingCredits: 3,
    credits: 3,
    excludedSessions: 1,
  });
});

test('full policy grants all attendable sessions', () => {
  assert.equal(calculateAdmissionCredits({ sessions, policy: 'full', asOf: '2026-01-20' }).credits, 5);
});

test('custom policy uses the administrator value', () => {
  assert.equal(calculateAdmissionCredits({ sessions, policy: 'custom', customCredits: 7 }).credits, 7);
});

test('invalid policies are rejected', () => {
  assert.throws(() => calculateAdmissionCredits({ sessions, policy: 'automatic' }), /Invalid admission credit policy/);
});
