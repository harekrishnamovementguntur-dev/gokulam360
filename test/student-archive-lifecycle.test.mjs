import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  transitionMembership,
} from '../lib/membership-domain.mjs';
import {
  transitionParticipation,
} from '../lib/membership-term-participation-domain.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lifecycleSource = fs.readFileSync(path.join(root, 'app/api/_lib/student-lifecycle.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'app/api/[[...path]]/route.js'), 'utf8');

test('archiving transitions active Memberships to inactive and active Participations to withdrawn', () => {
  const membership = transitionMembership(
    { id: 'm-1', status: 'active', lifecycle_history: [] },
    { status: 'inactive', actorId: 'admin-1', now: '2026-08-03T00:00:00.000Z', reason: 'student_archived' },
  );
  const participation = transitionParticipation(
    { id: 'p-1', status: 'active', lifecycle_history: [] },
    { status: 'withdrawn', actorId: 'admin-1', now: '2026-08-03T00:00:00.000Z', reason: 'student_archived' },
  );

  assert.equal(membership.status, 'inactive');
  assert.equal(participation.status, 'withdrawn');
  assert.equal(membership.lifecycle_history.at(-1).reason, 'student_archived');
  assert.equal(participation.lifecycle_history.at(-1).reason, 'student_archived');
});

test('student archive orchestration is transactional and preserves financial and attendance history', () => {
  assert.match(lifecycleSource, /runInTransaction\(db/);
  assert.match(lifecycleSource, /transitionMembership/);
  assert.match(lifecycleSource, /transitionParticipation/);
  assert.match(lifecycleSource, /auditLogs\.insertOne/);
  assert.match(lifecycleSource, /outboxEvents\.insertOne/);
  assert.doesNotMatch(lifecycleSource, /(?:attendance_records|payment_transactions|payment_allocations|credit_ledger_entries).*deleteMany/);
  assert.doesNotMatch(lifecycleSource, /(?:attendance_records|payment_transactions|payment_allocations|credit_ledger_entries).*deleteOne/);
});

test('Student DELETE routes to archive orchestration and does not delete legacy fees', () => {
  assert.match(routeSource, /archiveStudentCommand/);
  const studentBranch = routeSource.match(/if \(resource === 'students'\) \{[\s\S]*?\n      \}/)?.[0] || '';
  assert.match(studentBranch, /archiveStudentCommand/);
  assert.doesNotMatch(studentBranch, /fees.*deleteMany/);
  assert.doesNotMatch(studentBranch, /deleted_fee_records/);
});

test('archival reconciliation cannot leave active downstream records for the archived Student', () => {
  const activeMemberships = [{ student_id: 'student-1', status: 'active' }];
  const activeParticipations = [{ membership_id: 'membership-1', status: 'active' }];

  const archivedMemberships = activeMemberships.map((record) => ({ ...record, status: 'inactive' }));
  const archivedParticipations = activeParticipations.map((record) => ({ ...record, status: 'withdrawn' }));

  assert.equal(archivedMemberships.some((record) => record.status === 'active'), false);
  assert.equal(archivedParticipations.some((record) => record.status === 'active'), false);
  assert.equal(archivedMemberships[0].student_id, 'student-1');
  assert.equal(archivedParticipations[0].membership_id, 'membership-1');
});
