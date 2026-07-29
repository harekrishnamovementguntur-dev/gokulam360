import test from 'node:test';
import assert from 'node:assert/strict';
import { createAcademicProgram, createProgramOffering, transitionProgramEntity, updateProgramOffering } from '../lib/program-domain.mjs';

const ctx = { id: 'x', organizationId: 'o', actorId: 'u', now: '2026-07-29T00:00:00Z' };
const offeringInput = { program_id: 'program-1', academic_year: '2026-27', start_date: '2026-07-01', end_date: '2026-12-01', capacity: 20, schedule: { label: 'Sunday' } };

test('Program rejects operational and pricing fields', () => {
  assert.throws(() => createAcademicProgram({ ...ctx, input: { name: 'Gita', fee_amount: 1 } }), /fee_amount/);
  assert.throws(() => createAcademicProgram({ ...ctx, input: { name: 'Gita', schedule: {} } }), /schedule/);
});

test('Program stores only canonical academic fields', () => {
  const program = createAcademicProgram({ ...ctx, input: { name: ' Bhagavad-gita ', description: ' Study ', age_group: '8–12' } });
  assert.equal(program.name, 'Bhagavad-gita');
  assert.equal(program.description, 'Study');
  assert.deepEqual(program.metadata, {});
});

test('Offering owns validated delivery data', () => {
  const offering = createProgramOffering({ ...ctx, input: offeringInput });
  assert.equal(offering.program_id, 'program-1');
  assert.equal(offering.capacity, 20);
  assert.equal(offering.schedule.label, 'Sunday');
});

test('Offering rejects invalid dates and capacity', () => {
  assert.throws(() => createProgramOffering({ ...ctx, input: { ...offeringInput, start_date: '2026-12-02' } }), /start_date/);
  assert.throws(() => createProgramOffering({ ...ctx, input: { ...offeringInput, start_date: 'bad-date' } }), /start_date/);
  assert.throws(() => createProgramOffering({ ...ctx, input: { ...offeringInput, capacity: -1 } }), /capacity/);
});

test('Offering updates keep date ordering valid', () => {
  const offering = createProgramOffering({ ...ctx, input: offeringInput });
  assert.throws(() => updateProgramOffering(offering, { input: { end_date: '2026-06-01' }, actorId: 'u', now: '2026-07-30T00:00:00Z' }), /start_date/);
});

test('archived entity restores only to inactive', () => {
  const program = createAcademicProgram({ ...ctx, input: { name: 'Gita', status: 'active' } });
  const archived = transitionProgramEntity(program, { status: 'archived', actorId: 'u', now: '2026-07-30T00:00:00Z' });
  assert.throws(() => transitionProgramEntity(archived, { status: 'active', actorId: 'u', now: '2026-07-31T00:00:00Z' }));
  assert.equal(transitionProgramEntity(archived, { status: 'inactive', actorId: 'u', now: '2026-07-31T00:00:00Z' }).status, 'inactive');
});
