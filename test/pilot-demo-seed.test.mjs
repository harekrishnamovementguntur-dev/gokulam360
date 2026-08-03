import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const seedUrl = new URL('../scripts/seed-pilot-demo.mjs', import.meta.url);

test('Pilot Demo Seed is explicitly gated and production-safe', async () => {
  const source = await readFile(seedUrl, 'utf8');

  assert.match(source, /NODE_ENV.*production/);
  assert.match(source, /VERCEL_ENV.*production/);
  assert.match(source, /ALLOW_PILOT_DEMO_SEED/);
  assert.match(source, /PILOT_DEMO_SEED_CONFIRM/);
  assert.match(source, /PILOT_DEMO_DB_NAME/);
  assert.match(source, /startsWith\('gokulam360_pilot'\)/);
});

test('Pilot Demo Seed covers every canonical verification collection', async () => {
  const source = await readFile(seedUrl, 'utf8');

  for (const collection of [
    'organizations',
    'users',
    'academic_programs',
    'program_offerings',
    'academic_terms',
    'academic_sessions',
    'students',
    'memberships',
    'membership_term_participations',
    'payment_transactions',
    'payment_allocations',
    'credit_ledger_entries',
    'attendance_records',
    'audit_logs',
    'outbox_events',
  ]) {
    assert.match(source, new RegExp(collection));
  }

  assert.match(source, /pilot-demo-payment-posted/);
  assert.match(source, /pilot-demo-payment-draft/);
  assert.match(source, /present/);
  assert.match(source, /late/);
  assert.match(source, /absent/);
  assert.match(source, /excused/);
});

test('Pilot Demo Seed uses deterministic replacement markers', async () => {
  const source = await readFile(seedUrl, 'utf8');

  assert.match(source, /demo_seed_key: SEED_KEY/);
  assert.match(source, /replaceOne/);
  assert.match(source, /upsert: true/);
});
