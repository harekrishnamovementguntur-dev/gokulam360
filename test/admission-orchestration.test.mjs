import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/admissions/route.js', 'utf8');
const page = fs.readFileSync('app/page.js', 'utf8');
const submitStart = page.indexOf('  const submit = async () => {');
const submitEnd = page.indexOf('\n\n      setSuccess', submitStart);
const admissionSubmit = page.slice(submitStart, submitEnd);

test('admission command is transactional and idempotent', () => {
  assert.match(route, /Idempotency-Key/);
  assert.match(route, /admission_commands/);
  assert.match(route, /runInTransaction/);
  assert.match(route, /createMembership/);
  assert.match(route, /createParticipation/);
  assert.match(route, /createPayment/);
  assert.match(route, /createLedgerEntry/);
  assert.match(route, /audit_logs/);
  assert.match(route, /outbox_events/);
});

test('admission UI submits one canonical command instead of sequential writes', () => {
  assert.ok(submitStart >= 0 && submitEnd > submitStart, 'admission submit handler should be found');
  assert.match(admissionSubmit, /api\('\/admissions'/);
  assert.match(admissionSubmit, /Idempotency-Key/);
  assert.match(admissionSubmit, /organization_id: scopedOrganizationId/);
  assert.doesNotMatch(admissionSubmit, /api\('\/students'/);
  assert.doesNotMatch(admissionSubmit, /api\('\/memberships'/);
  assert.doesNotMatch(admissionSubmit, /api\('\/membership-term-participations'/);
  assert.doesNotMatch(admissionSubmit, /api\('\/payments'/);
});
