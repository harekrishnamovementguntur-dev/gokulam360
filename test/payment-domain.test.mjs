import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayment, validateAllocations, PaymentDomainError } from '../lib/payment-domain.mjs';

const base = { id: 'payment-1', organizationId: 'org-1', amountMinor: 10000, currency: 'INR', method: 'cash', description: 'Sunday School payment', receiptNumber: 'G360-2026-ABC123', actorId: 'user-1', now: '2026-07-31T00:00:00.000Z', idempotencyKey: 'request-1' };

test('creates a draft Payment Transaction with a receipt number', () => {
  const payment = createPayment(base);
  assert.equal(payment.status, 'draft');
  assert.equal(payment.kind, 'payment');
  assert.equal(payment.receipt_number, 'G360-2026-ABC123');
  assert.equal(payment.amount_minor, 10000);
});

test('requires allocations to exactly equal the payment amount', () => {
  assert.equal(validateAllocations([{ membership_id: 'm-1', amount_minor: 10000, credit_quantity: 10 }], 10000)[0].membership_id, 'm-1');
  assert.throws(() => validateAllocations([{ membership_id: 'm-1', amount_minor: 9999, credit_quantity: 10 }], 10000), PaymentDomainError);
});

test('rejects invalid payment and allocation values', () => {
  assert.throws(() => createPayment({ ...base, amountMinor: 0 }), PaymentDomainError);
  assert.throws(() => createPayment({ ...base, method: 'unknown' }), PaymentDomainError);
  assert.throws(() => validateAllocations([{ membership_id: 'm-1', amount_minor: 1, credit_quantity: -1 }], 1), PaymentDomainError);
});
