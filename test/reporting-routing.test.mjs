import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPORT_NAMES } from '../lib/reporting-domain.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => fs.readFileSync(path.join(here, '..', file), 'utf8');

test('report catalog exposes canonical report identifiers only', () => {
  assert.deepEqual(REPORT_NAMES, [
    'members',
    'memberships',
    'payments',
    'ledger',
    'attendance',
    'attendance-summary',
  ]);
  assert.equal(REPORT_NAMES.includes('students'), false);
  assert.equal(REPORT_NAMES.includes('fees'), false);
});

test('canonical report route delegates to the shared reporting endpoint', () => {
  const route = read('app/api/reports/[report]/route.js');
  assert.match(route, /reportEndpointResponse/);
  assert.match(route, /resolvedParams\?\.report/);
  assert.match(route, /'reports'/);
});

test('catch-all route no longer registers legacy report handlers', () => {
  const route = read('app/api/[[...path]]/route.js');
  assert.doesNotMatch(route, /resource === 'reports' && method === 'GET'/);
  assert.doesNotMatch(route, /type === 'students'/);
  assert.doesNotMatch(route, /type === 'fees'/);
  assert.doesNotMatch(route, /Unknown report/);
});

test('legacy Reports UI uses canonical report identifiers', () => {
  const page = read('app/page.js');
  const start = page.indexOf('function Reports()');
  const end = page.indexOf('function AttendanceStatusSummary', start);
  const reports = page.slice(start, end);
  assert.match(reports, /useState\('members'\)/);
  assert.match(reports, /const reportName = tab;/);
  assert.doesNotMatch(reports, /useState\('students'\)|value="students"|tab === 'students'/);
  assert.doesNotMatch(reports, /value="fees"|tab === 'fees'|fees:/);
});
