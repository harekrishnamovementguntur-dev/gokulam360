import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLedgerPipeline, buildPaymentsPipeline } from '../app/api/_lib/reporting-finance.mjs';
import { parseReportFilters } from '../lib/reporting-domain.mjs';

const scope = { organization_id: 'org-a' };
const baseFilters = {
  from: null, to: null, program_id: null, program_offering_id: null, term_id: null,
  session_id: null, membership_id: null, student_id: null, status: null,
  kind: null, payment_method: null, reason_code: null, source_type: null,
  page_size: 50, cursor: null, sort: 'created_at', direction: 'desc',
};

test('payment report begins with organization-scoped canonical transactions', () => {
  const pipeline = buildPaymentsPipeline(scope, baseFilters);
  assert.deepEqual(pipeline[0], { $match: { organization_id: 'org-a' } });
  const serialized = JSON.stringify(pipeline);
  assert.match(serialized, /payment_transactions|payment_allocations/);
  assert.doesNotMatch(serialized, /fees|legacy|attendance/);
});

test('credit ledger report begins with organization-scoped immutable entries', () => {
  const pipeline = buildLedgerPipeline(scope, { ...baseFilters, sort: 'effective_at' });
  assert.deepEqual(pipeline[0], { $match: { organization_id: 'org-a' } });
  const serialized = JSON.stringify(pipeline);
  assert.match(serialized, /credit_ledger_entries/);
  assert.match(serialized, /membership_balance/);
  assert.doesNotMatch(serialized, /fees|legacy|attendance/);
});

test('financial filters are applied to canonical sources', () => {
  const payments = buildPaymentsPipeline(scope, { ...baseFilters, status: 'posted', kind: 'payment' });
  assert.deepEqual(payments[0], { $match: { organization_id: 'org-a', status: 'posted', kind: 'payment' } });
  const ledger = buildLedgerPipeline(scope, { ...baseFilters, sort: 'effective_at', reason_code: 'credit_purchase', source_type: 'payment_allocation' });
  assert.deepEqual(ledger[0], { $match: { organization_id: 'org-a', reason_code: 'credit_purchase', source_type: 'payment_allocation' } });
});

test('shared parser accepts report-specific financial filters without organization override', () => {
  const filters = parseReportFilters(new URLSearchParams('kind=refund&reason_code=credit_purchase&source_type=payment_allocation&page_size=25'));
  assert.equal(filters.kind, 'refund');
  assert.equal(filters.reason_code, 'credit_purchase');
  assert.equal(filters.source_type, 'payment_allocation');
  assert.equal(filters.page_size, 25);
  assert.throws(() => parseReportFilters(new URLSearchParams('organization_id=other')), /organization_id must not be supplied/);
});

test('payment and ledger pipelines use bounded deterministic pagination', () => {
  const pipeline = buildLedgerPipeline(scope, { ...baseFilters, page_size: 10, sort: 'effective_at' });
  const serialized = JSON.stringify(pipeline);
  assert.match(serialized, /"\$limit":11/);
  assert.match(serialized, /"effective_at":-1/);
});
