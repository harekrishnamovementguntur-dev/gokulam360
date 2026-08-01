import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');

test('Program management navigation uses the canonical Programs and Offerings UI', () => {
  assert.match(page, /import ProgramsOfferings from '@\/components\/ProgramsOfferings';/);
  assert.match(page, /key: 'academic-programs', label: 'Programs & Offerings'/);
  assert.match(page, /view === 'academic-programs' && <ProgramsOfferings request=\{api\} \/>/);
  assert.doesNotMatch(page, /key: 'classes'/);
  assert.doesNotMatch(page, /view === 'classes'/);
  assert.doesNotMatch(page, /function Classes\(/);
  assert.doesNotMatch(page, /Classes & Batches/);
});
