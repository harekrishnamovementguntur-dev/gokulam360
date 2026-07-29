import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTerm,
  createSession,
  updateSession,
  generationCandidates,
  normalizeGenerationInput,
} from '../lib/academic-calendar-domain.mjs';

const ctx = { id: 'term-1', organizationId: 'org-1', actorId: 'user-1', now: '2026-07-29T00:00:00Z' };
const termInput = { program_offering_id: 'offering-1', name: 'Term 1', display_order: 1, start_date: '2026-08-01', end_date: '2026-08-31' };

test('Term validates its Program Offering and date range', () => {
  const term = createTerm({ ...ctx, input: termInput });
  assert.equal(term.program_offering_id, 'offering-1');
  assert.throws(() => createTerm({ ...ctx, input: { ...termInput, start_date: '2026-09-01' } }), /start_date/);
});

test('Session numbers are assigned and cannot be edited', () => {
  const session = createSession({ ...ctx, input: { term_id: 'term-1', date: '2026-08-02', start_time: '10:00', end_time: '11:30' }, sessionNumber: 1 });
  assert.equal(session.session_number, 1);
  assert.throws(() => updateSession(session, { input: { session_number: 2 }, actorId: 'user-1', now: ctx.now }), /immutable/);
});

test('Generation preview excludes holidays and preserves existing Sessions', () => {
  const existing = [createSession({ ...ctx, id: 'session-1', input: { term_id: 'term-1', date: '2026-08-02', start_time: '10:00', end_time: '11:30' }, source: 'generated', sessionNumber: 1 })];
  const preview = generationCandidates(
    createTerm({ ...ctx, input: termInput }),
    { weekdays: [0], start_date: '2026-08-01', end_date: '2026-08-31', start_time: '10:00', end_time: '11:30', excluded_dates: [], holiday_dates: [{ date: '2026-08-16', reason: 'Festival' }] },
    existing,
  );
  assert.equal(preview.candidates.find((item) => item.date === '2026-08-02').action, 'preserve');
  assert.equal(preview.candidates.some((item) => item.date === '2026-08-16'), false);
  assert.deepEqual(preview.holidays, [{ date: '2026-08-16', reason: 'Festival' }]);
});

test('Generation configuration requires at least one weekday and valid times', () => {
  assert.throws(() => normalizeGenerationInput({ weekdays: [], start_date: '2026-08-01', end_date: '2026-08-31', start_time: '10:00', end_time: '11:30' }), /weekday/);
  assert.throws(() => normalizeGenerationInput({ weekdays: [0], start_date: '2026-08-01', end_date: '2026-08-31', start_time: 'bad', end_time: '11:30' }), /HH:mm/);
});
