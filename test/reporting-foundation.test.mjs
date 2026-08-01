import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORTING_CONTRACT_VERSION,
  ReportingError,
  assertReportingAccess,
  cursorPredicate,
  decodeCursor,
  encodeCursor,
  parseReportFilters,
  reportCatalog,
  reportResponse,
} from '../lib/reporting-domain.mjs';
import { exportFormat, exportPlan } from '../lib/reporting-export.mjs';

test('validates shared report filters and rejects client organization scope', () => {
  const filters = parseReportFilters('?from=2026-01-01&to=2026-01-31&page_size=25&sort=created_at&direction=desc');
  assert.equal(filters.page_size, 25);
  assert.equal(filters.from, '2026-01-01');
  assert.throws(
    () => parseReportFilters('?organization_id=other-org'),
    (error) => error instanceof ReportingError && error.code === 'organization_scope_forbidden',
  );
  assert.throws(() => parseReportFilters('?from=2026-02-01&to=2026-01-01'), /from must not be after to/);
});

test('encodes, validates, and applies opaque cursor pagination', () => {
  const cursor = encodeCursor({ value: '2026-01-10T10:00:00.000Z', id: 'record-2' });
  const decoded = decodeCursor(cursor);
  assert.equal(decoded.id, 'record-2');
  assert.deepEqual(cursorPredicate(decoded), {
    $or: [
      { created_at: { $lt: '2026-01-10T10:00:00.000Z' } },
      { created_at: '2026-01-10T10:00:00.000Z', id: { $lt: 'record-2' } },
    ],
  });
  assert.throws(() => decodeCursor('not-a-cursor'), (error) => error.code === 'invalid_cursor');
});

test('derives organization authorization from the authenticated user', () => {
  assert.deepEqual(assertReportingAccess({ role: 'org_admin', organization_id: 'org-a' }), { organization_id: 'org-a' });
  assert.throws(() => assertReportingAccess({ role: 'org_admin', organization_id: 'org-a' }, ['teacher']), /Forbidden/);
  assert.throws(() => assertReportingAccess({ role: 'org_admin' }), (error) => error.code === 'organization_context_required');
  assert.throws(() => assertReportingAccess(null), (error) => error.code === 'unauthorized');
});

test('report response contract and export plan remain consistent', () => {
  const response = reportResponse({ items: [{ id: 'x' }], summary: { total: 1 }, filters: { page_size: 50 } });
  assert.equal(response.meta.contract_version, REPORTING_CONTRACT_VERSION);
  assert.equal(response.items.length, 1);
  assert.deepEqual(response.page, { page_size: 50, next_cursor: null, has_more: false });
  assert.equal(reportCatalog('reports', ['members']).reports[0].status, 'planned');
  assert.equal(exportFormat('CSV'), 'csv');
  assert.equal(exportPlan({ report: 'members', format: 'csv' }).delivery, 'stream');
});

test('filter and contract errors have stable machine-readable codes', () => {
  assert.throws(() => parseReportFilters('?page_size=201'), (error) => error.code === 'invalid_page_size');
  assert.throws(() => parseReportFilters('?direction=sideways'), (error) => error.code === 'invalid_direction');
  assert.throws(() => exportFormat('json'), (error) => error.code === 'invalid_export_format');
});
