import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTerm,
  createSession,
  updateSession,
  generationCandidates,
  normalizeGenerationInput,
  transitionSession,
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

test('Rescheduling records a new date and manual ownership', () => {
  const session = createSession({ ...ctx, input: { term_id: 'term-1', date: '2026-08-02', start_time: '10:00', end_time: '11:30' }, source: 'generated', sessionNumber: 1 });
  const updated = transitionSession(session, { status: 'rescheduled', details: { new_date: '2026-08-09' }, actorId: 'user-1', now: ctx.now });
  assert.equal(updated.date, '2026-08-09');
  assert.equal(updated.source, 'manual');
});

test('Generation cannot extend beyond the Term date range', () => {
  const term = createTerm({ ...ctx, input: termInput });
  assert.throws(() => generationCandidates(term, { weekdays: [0], start_date: '2026-07-01', end_date: '2026-08-31', start_time: '10:00', end_time: '11:30' }, []), /within the Term/);
});

test('Regeneration preserves a rescheduled Session by generation identity', () => {
  const term = createTerm({ ...ctx, input: termInput });
  const session = createSession({ ...ctx, id: 'session-rescheduled', input: { term_id: 'term-1', date: '2026-08-02', start_time: '10:00', end_time: '11:30', generation_key: 'term-1:2026-08-02' }, source: 'generated', sessionNumber: 1 });
  const rescheduled = transitionSession(session, { status: 'rescheduled', details: { new_date: '2026-08-09' }, actorId: 'user-1', now: ctx.now });
  const preview = generationCandidates(term, { weekdays: [0], start_date: '2026-08-01', end_date: '2026-08-31', start_time: '10:00', end_time: '11:30', excluded_dates: [], holiday_dates: [] }, [rescheduled]);
  assert.equal(preview.candidates.find((item) => item.requested_date === '2026-08-02').action, 'preserve');
  assert.equal(preview.candidates.filter((item) => item.action === 'create').length, 2);
  assert.equal(preview.preserved[0].status, 'rescheduled');
});

test('Generation configuration requires at least one weekday and valid times', () => {
  assert.throws(() => normalizeGenerationInput({ weekdays: [], start_date: '2026-08-01', end_date: '2026-08-31', start_time: '10:00', end_time: '11:30' }), /weekday/);
  assert.throws(() => normalizeGenerationInput({ weekdays: [0], start_date: '2026-08-01', end_date: '2026-08-31', start_time: 'bad', end_time: '11:30' }), /HH:mm/);
});
