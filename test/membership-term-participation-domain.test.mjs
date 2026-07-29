import test from 'node:test';
import assert from 'node:assert/strict';
import { createParticipation, transitionParticipation, ParticipationDomainError } from '../lib/membership-term-participation-domain.mjs';

const base = { id: 'p1', organizationId: 'org1', membershipId: 'm1', programOfferingId: 'o1', termId: 't1', actorId: 'u1', now: '2026-01-01T00:00:00.000Z' };

test('creates Active Participation with immutable references', () => {
  const participation = createParticipation(base);
  assert.equal(participation.status, 'active');
  assert.equal(participation.membership_id, 'm1');
  assert.equal(participation.term_id, 't1');
  assert.equal(participation.lifecycle_history.length, 1);
});

test('rejects invalid lifecycle transitions', () => {
  const participation = createParticipation(base);
  assert.throws(() => transitionParticipation(participation, { status: 'completed', actorId: 'u1', now: base.now }), ParticipationDomainError);
  const completed = transitionParticipation(participation, { status: 'completed', actorId: 'u1', now: base.now });
  assert.equal(completed.status, 'completed');
});

test('archives and restores Participation', () => {
  const participation = createParticipation(base);
  const archived = transitionParticipation(participation, { status: 'archived', actorId: 'u1', now: base.now });
  assert.equal(archived.status, 'archived');
  const restored = transitionParticipation(archived, { status: 'active', actorId: 'u1', now: base.now });
  assert.equal(restored.status, 'active');
});
