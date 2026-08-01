import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMembersPipeline, buildMembershipsPipeline } from '../app/api/_lib/reporting-members.js';

const scope = { organization_id: 'org-a' };
const baseFilters = {
  from: null, to: null, program_id: null, program_offering_id: null, term_id: null,
  session_id: null, membership_id: null, student_id: null, status: null,
  page_size: 50, cursor: null, sort: 'created_at', direction: 'desc',
};

test('members report begins with organization-scoped canonical student query', () => {
  const pipeline = buildMembersPipeline(scope, baseFilters);
  assert.deepEqual(pipeline[0], { $match: { organization_id: 'org-a', is_deleted: { $ne: true } } });
  assert.equal(pipeline.some((stage) => JSON.stringify(stage).includes('legacy')), false);
  assert.match(JSON.stringify(pipeline), /memberships/);
});

test('memberships report begins with organization scope and joins canonical student and participation data', () => {
  const pipeline = buildMembershipsPipeline(scope, baseFilters);
  assert.deepEqual(pipeline[0], { $match: { organization_id: 'org-a' } });
  const serialized = JSON.stringify(pipeline);
  assert.match(serialized, /students/);
  assert.match(serialized, /membership_term_participations/);
  assert.doesNotMatch(serialized, /fees|attendance|payments/);
});

test('report filters are applied to canonical memberships', () => {
  const pipeline = buildMembershipsPipeline(scope, {
    ...baseFilters, status: 'active', student_id: 'student-a', program_id: 'program-a',
  });
  assert.deepEqual(pipeline[0], {
    $match: {
      organization_id: 'org-a',
      program_id: 'program-a',
      status: 'active',
      student_id: 'student-a',
    },
  });
});

test('reports use a bounded page size and deterministic cursor sort', () => {
  const pipeline = buildMembersPipeline(scope, { ...baseFilters, page_size: 25, sort: 'id', direction: 'asc' });
  const serialized = JSON.stringify(pipeline);
  assert.match(serialized, /"\$limit":26/);
  assert.match(serialized, /"id":1/);
});
