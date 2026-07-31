import { v4 as uuidv4 } from 'uuid';
import { PaymentDomainError, createPayment, validateAllocations, refundStatus } from '../../../lib/payment-domain.mjs';
import { createLedgerEntry } from '../../../lib/credit-ledger-domain.mjs';
import { ensureCreditLedgerInfrastructure } from './credit-ledger.js';
import { runInTransaction, stripId } from './server.js';

let infrastructurePromise;
const audit = ({ organizationId, entityType, entityId, actor, action, now, details }) => ({ id: uuidv4(), organization_id: organizationId, entity_type: entityType, entity_id: entityId, action, actor_id: actor.id, actor_name: actor.name || '', details, created_at: now });
const outbox = ({ organizationId, aggregateType, aggregateId, eventType, payload, now }) => ({ id: uuidv4(), organization_id: organizationId, aggregate_type: aggregateType, aggregate_id: aggregateId, event_type: eventType, payload, status: 'pending', occurred_at: now, created_at: now });
export async function ensurePaymentInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = Promise.all([
      db.collection('payment_transactions').createIndexes([
        { key: { organization_id: 1, created_at: -1 }, name: 'payments_by_organization_created' },
        { key: { organization_id: 1, receipt_number: 1 }, unique: true, name: 'payments_receipt_unique' },
        { key: { organization_id: 1, idempotency_key: 1 }, unique: true, name: 'payments_idempotency_unique' },
        { key: { organization_id: 1, original_payment_id: 1, kind: 1 }, name: 'payments_by_original_payment' },
      ]),
      db.collection('payment_allocations').createIndexes([
        { key: { organization_id: 1, payment_transaction_id: 1, created_at: 1 }, name: 'allocations_by_payment_created' },
        { key: { organization_id: 1, membership_id: 1, created_at: -1 }, name: 'allocations_by_membership_created' },
      ]),
      db.collection('audit_logs').createIndex({ organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 }, { name: 'audit_logs_by_payment_entity' }),
      db.collection('outbox_events').createIndex({ organization_id: 1, aggregate_type: 1, aggregate_id: 1, occurred_at: 1 }, { name: 'outbox_events_by_payment_aggregate' }),
    ]).catch((error) => { infrastructurePromise = undefined; throw error; });
  }
  return infrastructurePromise;
}
const receiptNumber = () => 'G360-' + new Date().getUTCFullYear() + '-' + uuidv4().replaceAll('-', '').slice(0, 10).toUpperCase();
async function findPayment(db, organizationId, id) {
  const payment = await db.collection('payment_transactions').findOne({ id, organization_id: organizationId });
  if (!payment) throw new PaymentDomainError('Payment Transaction not found in this organization', 404);
  return payment;
}
export async function listPayments({ db, organizationId }) {
  const payments = await db.collection('payment_transactions').find({ organization_id: organizationId }).sort({ created_at: -1 }).limit(200).toArray();
  return payments.map(stripId);
}
export async function getPaymentDetails({ db, organizationId, id }) {
  const payment = await findPayment(db, organizationId, id);
  const allocations = await db.collection('payment_allocations').find({ organization_id: organizationId, payment_transaction_id: id }).sort({ created_at: 1 }).toArray();
  return { payment: stripId(payment), allocations: allocations.map(stripId) };
}
export async function createPaymentCommand({ db, user, organizationId, body, idempotencyKey }) {
  const key = String(idempotencyKey || '').trim();
  if (!key) throw new PaymentDomainError('Idempotency-Key header is required', 400);
  const existing = await db.collection('payment_transactions').findOne({ organization_id: organizationId, idempotency_key: key });
  if (existing) return stripId(existing);
  const now = new Date().toISOString();
  const payment = createPayment({ id: uuidv4(), organizationId, amountMinor: Number(body.amount_minor), currency: body.currency || 'INR', method: body.payment_method || 'cash', description: body.description, receiptNumber: receiptNumber(), actorId: user.id, now, idempotencyKey: key });
  await runInTransaction(db, async (session) => {
    await db.collection('payment_transactions').insertOne(payment, { session });
    await db.collection('audit_logs').insertOne(audit({ organizationId, entityType: 'payment_transaction', entityId: payment.id, actor: user, action: 'payment.created', now, details: { status: payment.status, receipt_number: payment.receipt_number } }), { session });
    await db.collection('outbox_events').insertOne(outbox({ organizationId, aggregateType: 'payment_transaction', aggregateId: payment.id, eventType: 'payment.created', now, payload: { payment_id: payment.id, receipt_number: payment.receipt_number } }), { session });
  });
  return stripId(payment);
}
async function membershipFor(db, organizationId, membershipId) {
  const membership = await db.collection('memberships').findOne({ id: membershipId, organization_id: organizationId });
  if (!membership) throw new PaymentDomainError('Membership not found in this organization', 404);
  return membership;
}
export async function postPaymentCommand({ db, user, organizationId, id, body, idempotencyKey }) {
  const key = String(idempotencyKey || '').trim();
  if (!key) throw new PaymentDomainError('Idempotency-Key header is required', 400);
  const payment = await findPayment(db, organizationId, id);
  if (payment.status === 'posted') return getPaymentDetails({ db, organizationId, id });
  if (payment.status !== 'draft') throw new PaymentDomainError('Only draft Payment Transactions may be posted', 409);
  const allocations = validateAllocations(body.allocations, payment.amount_minor);
  const now = new Date().toISOString();
  const normalized = await Promise.all(allocations.map(async (item) => ({ ...item, membership: await membershipFor(db, organizationId, item.membership_id), id: uuidv4() })));
  await ensureCreditLedgerInfrastructure(db);
  await runInTransaction(db, async (session) => {
    const current = await db.collection('payment_transactions').findOne({ id, organization_id: organizationId }, { session });
    if (!current || current.status !== 'draft') return;
    await db.collection('payment_transactions').updateOne({ id, organization_id: organizationId, status: 'draft' }, { $set: { status: 'posted', posted_at: now, updated_at: now, post_idempotency_key: key } }, { session });
    for (const item of normalized) {
      const entry = createLedgerEntry({ id: uuidv4(), organizationId, membershipId: item.membership_id, quantityDelta: item.credit_quantity, reasonCode: 'credit_purchase', description: item.description || 'Credits granted from posted Payment Transaction', sourceType: 'payment_allocation', sourceId: item.id, actorId: user.id, now, commandId: item.id });
      await db.collection('payment_allocations').insertOne({ id: item.id, organization_id: organizationId, payment_transaction_id: id, membership_id: item.membership_id, amount_minor: item.amount_minor, credit_quantity: item.credit_quantity, allocation_type: 'payment', status: 'posted', description: item.description, created_by: user.id, created_at: now }, { session });
      await db.collection('credit_ledger_entries').insertOne(entry, { session });
    }
    await db.collection('audit_logs').insertOne(audit({ organizationId, entityType: 'payment_transaction', entityId: id, actor: user, action: 'payment.posted', now, details: { allocation_count: normalized.length } }), { session });
    await db.collection('outbox_events').insertOne(outbox({ organizationId, aggregateType: 'payment_transaction', aggregateId: id, eventType: 'payment.posted', now, payload: { payment_id: id, allocation_count: normalized.length } }), { session });
  });
  return getPaymentDetails({ db, organizationId, id });
}
export async function refundPaymentCommand({ db, user, organizationId, id, body, idempotencyKey }) {
  const key = String(idempotencyKey || '').trim();
  if (!key) throw new PaymentDomainError('Idempotency-Key header is required', 400);
  const existingRefund = await db.collection('payment_transactions').findOne({ organization_id: organizationId, idempotency_key: key, kind: 'refund' });
  if (existingRefund) return getPaymentDetails({ db, organizationId, id: existingRefund.id });
  const original = await findPayment(db, organizationId, id);
  if (!['posted','partially_refunded'].includes(original.status)) throw new PaymentDomainError('Only posted Payment Transactions may be refunded', 409);
  const amount = Number(body.amount_minor);
  if (!Number.isInteger(amount) || amount <= 0 || amount > original.amount_minor) throw new PaymentDomainError('Refund amount must be a positive integer within the original amount');
  const originalAllocations = await db.collection('payment_allocations').find({ organization_id: organizationId, payment_transaction_id: id, allocation_type: 'payment' }).toArray();
  const priorRefunds = await db.collection('payment_transactions').find({ organization_id: organizationId, original_payment_id: id, kind: 'refund' }).toArray();
  const alreadyRefunded = priorRefunds.reduce((sum, item) => sum + item.amount_minor, 0);
  if (alreadyRefunded + amount > original.amount_minor) throw new PaymentDomainError('Refund exceeds the remaining refundable amount', 409);
  const ratio = amount / original.amount_minor;
  const refundAllocations = originalAllocations.map(item => ({ membership_id: item.membership_id, amount_minor: Math.floor(item.amount_minor * ratio), credit_quantity: Math.floor(item.credit_quantity * ratio), description: body.description || 'Compensating allocation for refund' })).filter(item => item.amount_minor > 0 || item.credit_quantity > 0);
  const refund = createPayment({ id: uuidv4(), organizationId, amountMinor: amount, currency: original.currency, method: original.payment_method, description: body.description || 'Refund of ' + original.receipt_number, receiptNumber: receiptNumber(), actorId: user.id, now: new Date().toISOString(), idempotencyKey: key });
  refund.kind = 'refund'; refund.status = 'posted'; refund.original_payment_id = id; refund.posted_at = refund.created_at;
  await runInTransaction(db, async (session) => {
    await db.collection('payment_transactions').insertOne(refund, { session });
    for (const item of refundAllocations) {
      const allocation = { id: uuidv4(), organization_id: organizationId, payment_transaction_id: refund.id, original_payment_transaction_id: id, membership_id: item.membership_id, amount_minor: -item.amount_minor, credit_quantity: -item.credit_quantity, allocation_type: 'refund', status: 'posted', description: item.description, created_by: user.id, created_at: refund.created_at };
      await db.collection('payment_allocations').insertOne(allocation, { session });
      const entry = createLedgerEntry({ id: uuidv4(), organizationId, membershipId: item.membership_id, quantityDelta: -item.credit_quantity, reasonCode: 'refund_reversal', description: item.description, sourceType: 'payment_refund_allocation', sourceId: allocation.id, actorId: user.id, now: refund.created_at, commandId: allocation.id });
      await db.collection('credit_ledger_entries').insertOne(entry, { session });
    }
    const nextStatus = refundStatus(alreadyRefunded + amount, original.amount_minor);
    await db.collection('payment_transactions').updateOne({ id, organization_id: organizationId }, { $set: { status: nextStatus, updated_at: refund.created_at } }, { session });
    await db.collection('audit_logs').insertOne(audit({ organizationId, entityType: 'payment_transaction', entityId: refund.id, actor: user, action: 'payment.refunded', now: refund.created_at, details: { original_payment_id: id, amount_minor: amount } }), { session });
    await db.collection('outbox_events').insertOne(outbox({ organizationId, aggregateType: 'payment_transaction', aggregateId: refund.id, eventType: 'payment.refunded', now: refund.created_at, payload: { payment_id: refund.id, original_payment_id: id, amount_minor: amount } }), { session });
  });
  return getPaymentDetails({ db, organizationId, id: refund.id });
}
