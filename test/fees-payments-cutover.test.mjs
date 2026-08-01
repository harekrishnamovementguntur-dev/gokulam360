import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');

test('admin navigation exposes canonical Payments instead of legacy Fees', () => {
  assert.match(page, /key: 'payments', label: 'Payments'/);
  assert.doesNotMatch(page, /key: 'fees', label: 'Fees'/);
  assert.doesNotMatch(page, /view === 'fees'/);
});

test('legacy Fees UI and fee write operations are removed from the application shell', () => {
  assert.doesNotMatch(page, /function Fees\s*\(/);
  assert.doesNotMatch(page, /\/fees(?:\/\$\{[^}]+\})?/);
  assert.doesNotMatch(page, /markPaid|saveNote/);
  assert.match(page, /<Payments organizationId=\{org\?\.id\}/);
});


test('super-admin Payments UI supports explicit organization scope', async () => {
  const payments = await readFile(new URL('../components/Payments.js', import.meta.url), 'utf8');
  assert.match(payments, /selectedOrganizationId/);
  assert.match(payments, /request\('\/organizations'\)/);
  assert.match(payments, /organization_id: scopeId/);
});