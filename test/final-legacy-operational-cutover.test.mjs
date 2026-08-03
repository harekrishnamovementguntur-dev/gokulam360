import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/[[...path]]/route.js', import.meta.url);
const pageUrl = new URL('../app/page.js', import.meta.url);

test('Student API no longer invokes legacy enrollment synchronization', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.equal(source.includes('syncEnrollments'), false);
  assert.equal(source.includes("collection('fees')"), false);
  assert.match(source, /payment_transactions/);
  assert.match(source, /attendance_records/);
  assert.match(source, /Legacy Enrollment API is disabled/);
});

test('Administrator UI uses canonical Membership and Participation sources', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.equal(source.includes("api('/enrollments')"), false);
  assert.equal(source.includes("api('/membership-term-participations?status=active')"), true);
  assert.equal(source.includes("api('/memberships?status=active')"), true);
  assert.equal(source.includes("api('/memberships'"), true);
  assert.match(source, /Pending Payments/);
  assert.equal(source.includes('keep legacy'), false);
});

test('Deprecated Fees route is no longer registered for Administrator operations', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.equal(source.includes("fees: ['org_admin', 'super_admin']"), false);
});
