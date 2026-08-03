import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/[[...path]]/route.js', import.meta.url);
const pageUrl = new URL('../app/page.js', import.meta.url);

test('Student API no longer invokes legacy enrollment synchronization', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.doesNotMatch(source, /syncEnrollments/);
  assert.doesNotMatch(source, /collection\\('fees'\\)/);
  assert.match(source, /payment_transactions/);
  assert.match(source, /attendance_records/);
  assert.match(source, /Legacy Enrollment API is disabled/);
});

test('Administrator UI uses canonical Membership and Participation sources', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.doesNotMatch(source, /api\\('\\/enrollments'\\)/);
  assert.match(source, /api\\('\\/membership-term-participations\\?status=active'/);
  assert.match(source, /api\\('\\/memberships\\?status=active'/);
  assert.match(source, /api\\('\\/memberships'/);
  assert.match(source, /Pending Payments/);
  assert.doesNotMatch(source, /keep legacy/);
});

test('Deprecated Fees route is no longer registered for Administrator operations', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.doesNotMatch(source, /fees: \\['org_admin', 'super_admin'\\]/);
});
