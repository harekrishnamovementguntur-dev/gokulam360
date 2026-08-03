import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'components/Memberships.js'), 'utf8');

test('Memberships loads canonical Academic Programs and not the legacy Programs endpoint', () => {
  assert.match(source, /request\('\/academic-programs'\)/);
  assert.doesNotMatch(source, /request\('\/programs'\)/);
});

test('Membership creation keeps the canonical program_id payload', () => {
  assert.match(source, /program_id/);
  assert.match(source, /request\('\/memberships', \{ method: 'POST', body: JSON\.stringify\(form\) \}\)/);
});

test('Membership UI uses canonical Academic Program terminology', () => {
  assert.match(source, /<TableHead>Academic Program<\/TableHead>/);
  assert.match(source, /<Label>Academic Program<\/Label>/);
  assert.match(source, /Select Academic Program/);
});
