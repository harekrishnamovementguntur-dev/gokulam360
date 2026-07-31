import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedgerEntry, CreditLedgerDomainError } from '../lib/credit-ledger-domain.mjs';

const base = {
  id: 'entry-1',
  organizationId: 'org-1',
  membershipId: 'membership-1',
  quantityDelta: 10,
  reasonCode: 'manual_adjustment',
  description: 'Correction approved by administrator',
  sourceType: 'admin_manual_adjustment',
  sourceId: 'command-1',
  actorId: 'user-1',
  now: '2026-07-29T00:00:00.000Z',
  commandId: 'command-1',
};

test('creates an immutable-style ledger entry with reason and source traceability', () => {
  const entry = createLedgerEntry(base);
  assert.equal(entry.quantity_delta, 10);
  assert.equal(entry.reason_code, 'manual_adjustment');
  assert.equal(entry.description, 'Correction approved by administrator');
  assert.equal(entry.source_type, 'admin_manual_adjustment');
  assert.equal(entry.source_id, 'command-1');
});

test('rejects zero, invalid reason, and missing source references', () => {
  assert.throws(() => createLedgerEntry({ ...base, quantityDelta: 0 }), CreditLedgerDomainError);
  assert.throws(() => createLedgerEntry({ ...base, reasonCode: 'unknown' }), CreditLedgerDomainError);
  assert.throws(() => createLedgerEntry({ ...base, sourceId: '' }), CreditLedgerDomainError);
});
