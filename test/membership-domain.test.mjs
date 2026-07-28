import test from 'node:test';
import assert from 'node:assert/strict';
import { createMembership, transitionMembership } from '../lib/membership-domain.mjs';

const base = {
  id: 'membership-1',
  organizationId: 'org-1',
  studentId: 'student-1',
  programId: 'program-1',
  actorId: 'user-1',
  now: '2026-07-28T00:00:00.000Z',
};

test('creates a durable Membership with its initial lifecycle event', () => {
  const membership = createMembership(base);
  assert.equal(membership.status, 'pending');
  assert.equal(membership.student_id, 'student-1');
  assert.equal(membership.program_id, 'program-1');
  assert.deepEqual(membership.lifecycle_history[0], {
    from_status: null, to_status: 'pending', reason: 'created',
    changed_by: 'user-1', changed_at: '2026-07-28T00:00:00.000Z',
  });
});

test('records allowed lifecycle transitions without overwriting history', () => {
  const membership = createMembership(base);
  const active = transitionMembership(membership, {
    status: 'active', actorId: 'admin-2', now: '2026-07-29T00:00:00.000Z', reason: 'approved',
  });
  assert.equal(active.status, 'active');
  assert.equal(active.lifecycle_history.length, 2);
  assert.equal(membership.lifecycle_history.length, 1);
  assert.equal(active.lifecycle_history[1].from_status, 'pending');
});

test('rejects invalid statuses and invalid lifecycle transitions', () => {
  assert.throws(() => createMembership({ ...base, status: 'deleted' }), /Invalid membership status/);
  const membership = createMembership({ ...base, status: 'pending' });
  assert.throws(() => transitionMembership(membership, {
    status: 'completed', actorId: 'admin-2', now: '2026-07-29T00:00:00.000Z',
  }), /cannot transition/);
});
