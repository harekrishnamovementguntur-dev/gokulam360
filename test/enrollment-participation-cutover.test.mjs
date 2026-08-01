import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');
const start = page.indexOf('function EnrollmentHistoryDialog');
const end = page.indexOf('function Teachers', start);
const history = page.slice(start, end);

test('Student history uses canonical Membership Term Participation APIs', () => {
  assert.ok(history.includes('api(`/memberships?student_id=${studentId}`)'));
  assert.ok(history.includes('api(`/membership-term-participations?student_id=${studentId}`)'));
  assert.ok(history.includes("api('/program-offerings')"));
  assert.ok(history.includes("api('/academic-terms')"));
  assert.ok(history.includes("api('/membership-term-participations'"));
  assert.doesNotMatch(history, /\/enrollments(?:\/renew)?/);
  assert.doesNotMatch(history, /function EnrollmentCard/);
});

test('canonical participation creation requires the complete relationship chain', () => {
  assert.match(history, /membership_id: form\.membership_id/);
  assert.match(history, /program_offering_id: form\.program_offering_id/);
  assert.match(history, /term_id: form\.term_id/);
});
