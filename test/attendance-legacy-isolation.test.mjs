import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catchAllRoute = new URL('../app/api/[[...path]]/route.js', import.meta.url);

test('legacy attendance bulk mutations are not registered', async () => {
  const source = await readFile(catchAllRoute, 'utf8');

  assert.doesNotMatch(source, /resource\s*===\s*['"]attendance-bulk['"]/);
  assert.doesNotMatch(source, /collection\(['"]attendance['"]\)\.(insertOne|insertMany|updateOne|updateMany|replaceOne|deleteOne|deleteMany)/);
  assert.match(source, /attendance_records/);
});

test('legacy backup restore rejects legacy attendance payloads', async () => {
  const source = await readFile(catchAllRoute, 'utf8');

  assert.match(source, /Legacy attendance backup restore is not supported/);
  assert.doesNotMatch(source, /const collections = \[[^\]]*['"]attendance['"]/);
});
