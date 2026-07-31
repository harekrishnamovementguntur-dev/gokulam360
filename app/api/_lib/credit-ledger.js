import { v4 as uuidv4 } from 'uuid';
import {
  CreditLedgerDomainError,
  createLedgerEntry,
} from '../../../lib/credit-ledger-domain.mjs';
import { runInTransaction, stripId } from './server.js';
import { ensureIndexByKey } from '../../../lib/mongo-indexes.mjs';

let infrastructurePromise;

function auditDocument(entry, actor, action, now, details = {}) {
  return {
    id: uuidv4(),
    organization_id: entry.organization_id,
    entity_type: 'credit_ledger_entry',
    entity_id: entry.id,
    action,
    actor_id: actor.id,
    actor_name: actor.name || '',
    details,
    created_at: now,
  };
}

function outboxDocument(entry, eventType, now, details = {}) {
  return {
    id: uuidv4(),
    organization_id: entry.organization_id,
    aggregate_type: 'membership_credit_ledger',
    aggregate_id: entry.membership_id,
    event_type: eventType,
    payload: {
      ledger_entry_id: entry.id,
      membership_id: entry.membership_id,
      quantity_delta: entry.quantity_delta,
      reason_code: entry.reason_code,
      source_type: entry.source_type,
      source_id: entry.source_id,
      ...details,
    },
    status: 'pending',
    occurred_at: now,
    created_at: now,
  };
}

export async function ensureCreditLedgerInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = Promise.all([
      db.collection('credit_ledger_entries').createIndexes([
        { key: { organization_id: 1, membership_id: 1, effective_at: 1, created_at: 1 }, name: 'credit_ledger_membership_timeline' },
        { key: { organization_id: 1, membership_id: 1, source_type: 1, source_id: 1 }, name: 'credit_ledger_source_trace' },
        { key: { organization_id: 1, reason_code: 1, created_at: -1 }, name: 'credit_ledger_reason_created' },
        { key: { organization_id: 1, command_id: 1 }, unique: true, name: 'credit_ledger_command_unique' },
      ]),
      db.collection('credit_ledger_command_receipts').createIndexes([
        { key: { organization_id: 1, idempotency_key: 1 }, unique: true, name: 'credit_ledger_idempotency_unique' },
      ]),
      ensureIndexByKey(
        db.collection('audit_logs'),
        { organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 },
        { name: 'audit_logs_by_credit_ledger_entity' },
      ),
      db.collection('outbox_events').createIndex(
        { organization_id: 1, aggregate_type: 1, aggregate_id: 1, occurred_at: 1 },
        { name: 'outbox_events_by_credit_aggregate' },
      ),
    ]).catch((error) => {
      infrastructurePromise = undefined;
      throw error;
    });
  }
  return infrastructurePromise;
}

function runningEntries(entries) {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.quantity_delta;
    return { ...stripId(entry), running_balance: balance };
  });
}

export async function getMembershipLedger({ db, organizationId, membershipId }) {
  const membership = await db.collection('memberships').findOne({
    id: membershipId,
    organization_id: organizationId,
  });
  if (!membership) throw new CreditLedgerDomainError('Membership not found in this organization', 404);
  const entries = await db.collection('credit_ledger_entries')
    .find({ organization_id: organizationId, membership_id: membershipId })
    .sort({ effective_at: 1, created_at: 1, id: 1 })
    .toArray();
  const items = runningEntries(entries);
  return {
    membership_id: membershipId,
    balance: items.length ? items[items.length - 1].running_balance : 0,
    items,
  };
}

export async function createManualAdjustment({ db, user, organizationId, body, idempotencyKey }) {
  const key = String(idempotencyKey || '').trim();
  if (!key) throw new CreditLedgerDomainError('Idempotency-Key header is required', 400);
  const membershipId = String(body.membership_id || '').trim();
  const membership = await db.collection('memberships').findOne({
    id: membershipId,
    organization_id: organizationId,
  });
  if (!membership) throw new CreditLedgerDomainError('Membership not found in this organization', 404);

  const commandId = uuidv4();
  const now = new Date().toISOString();
  const entry = createLedgerEntry({
    id: uuidv4(),
    organizationId,
    membershipId,
    quantityDelta: Number(body.quantity_delta),
    reasonCode: body.reason_code || 'manual_adjustment',
    description: typeof body.description === 'string' ? body.description : '',
    sourceType: 'admin_manual_adjustment',
    sourceId: commandId,
    actorId: user.id,
    now,
    commandId,
  });

  const response = await runInTransaction(db, async (session) => {
    const existing = await db.collection('credit_ledger_command_receipts').findOne(
      { organization_id: organizationId, idempotency_key: key },
      { session },
    );
    if (existing) return existing.response;

    await db.collection('credit_ledger_entries').insertOne(entry, { session });
    await db.collection('audit_logs').insertOne(
      auditDocument(entry, user, 'credit_ledger.manual_adjustment', now, {
        reason_code: entry.reason_code,
        description: entry.description,
        source_type: entry.source_type,
        source_id: entry.source_id,
      }),
      { session },
    );
    await db.collection('outbox_events').insertOne(
      outboxDocument(entry, 'credit_ledger.entry_posted', now),
      { session },
    );

    const responseBody = stripId(entry);
    await db.collection('credit_ledger_command_receipts').insertOne({
      id: uuidv4(),
      organization_id: organizationId,
      idempotency_key: key,
      command_id: commandId,
      response: responseBody,
      created_at: now,
    }, { session });
    return responseBody;
  });
  return response;
}
