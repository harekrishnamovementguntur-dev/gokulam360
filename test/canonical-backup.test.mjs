import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceUrl = new URL('../app/api/_lib/canonical-backup.js', import.meta.url);
const routeUrl = new URL('../app/api/[[...path]]/route.js', import.meta.url);

test('canonical backup enumerates canonical collections and rejects legacy data', async () => {
  const source = await readFile(serviceUrl, 'utf8');
  for (const name of ['students', 'academic_programs', 'program_offerings', 'academic_terms', 'academic_sessions', 'memberships', 'membership_term_participations', 'payment_transactions', 'payment_allocations', 'credit_ledger_entries', 'attendance_records', 'audit_logs', 'outbox_events']) assert.ok(source.includes(`'${name}'`), name);
  for (const name of ['enrollments', 'fees', 'attendance']) assert.ok(source.includes(`'${name}'`), name);
  assert.match(source, /canonical-v1/);
});

test('restore is transaction-bound and writes audit/outbox records', async () => {
  const source = await readFile(serviceUrl, 'utf8');
  assert.match(source, /withTransaction/);
  assert.match(source, /backup\.restored/);
  assert.match(source, /transactions_unavailable/);
});

test('legacy catch-all delegates backup operations to canonical service', async () => {
  const source = await readFile(routeUrl, 'utf8');
  assert.match(source, /exportCanonicalBackup/);
  assert.match(source, /restoreCanonicalBackup/);
  assert.doesNotMatch(source, /Backup export - entire org data as JSON/);
});
