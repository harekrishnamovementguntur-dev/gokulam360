import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureIndexByKey } from '../lib/mongo-indexes.mjs';

function fakeCollection(indexes) {
  const created = [];
  return {
    created,
    listIndexes() {
      return { toArray: async () => indexes };
    },
    async createIndex(key, options) {
      created.push({ key, options });
      return options.name;
    },
  };
}

test('reuses an existing index when only the name differs', async () => {
  const collection = fakeCollection([
    { name: 'audit_logs_by_membership_entity', key: { organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 } },
  ]);

  const name = await ensureIndexByKey(
    collection,
    { organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 },
    { name: 'audit_logs_by_credit_ledger_entity' },
  );

  assert.equal(name, 'audit_logs_by_membership_entity');
  assert.equal(collection.created.length, 0);
});

test('creates an index when the key pattern is absent', async () => {
  const collection = fakeCollection([]);
  const name = await ensureIndexByKey(
    collection,
    { organization_id: 1, aggregate_type: 1, aggregate_id: 1, occurred_at: 1 },
    { name: 'outbox_events_by_credit_aggregate' },
  );

  assert.equal(name, 'outbox_events_by_credit_aggregate');
  assert.deepEqual(collection.created, [{
    key: { organization_id: 1, aggregate_type: 1, aggregate_id: 1, occurred_at: 1 },
    options: { name: 'outbox_events_by_credit_aggregate' },
  }]);
});
