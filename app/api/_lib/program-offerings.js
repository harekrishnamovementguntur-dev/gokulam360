import { v4 as uuidv4 } from 'uuid';
import { ProgramDomainError, createAcademicProgram, createProgramOffering, updateAcademicProgram, updateProgramOffering, transitionProgramEntity } from '../../../lib/program-domain.mjs';
import { runInTransaction, stripId } from './server.js';

let provision;

const auditRecord = (organizationId, user, action, entityId, now, details = {}) => ({
  id: uuidv4(), organization_id: organizationId, entity_type: action.split('.')[0], entity_id: entityId,
  action, actor_id: user.id, actor_name: user.name || '', details, created_at: now,
});
const outboxRecord = (organizationId, eventType, entity, now) => ({
  id: uuidv4(), organization_id: organizationId, aggregate_type: eventType.split('.')[0], aggregate_id: entity.id,
  event_type: eventType, payload: { id: entity.id, organization_id: organizationId }, status: 'pending', occurred_at: now, created_at: now,
});

export async function ensureProgramInfrastructure(db) {
  if (!provision) {
    provision = Promise.all([
      db.collection('academic_programs').createIndexes([
        { key: { organization_id: 1, name: 1 }, name: 'academic_programs_org_name', unique: true },
        { key: { organization_id: 1, status: 1, created_at: -1 }, name: 'academic_programs_org_status' },
      ]),
      db.collection('program_offerings').createIndexes([
        { key: { organization_id: 1, program_id: 1, academic_year: 1, cohort: 1 }, name: 'offerings_program_year_cohort', unique: true },
        { key: { organization_id: 1, status: 1, start_date: 1 }, name: 'offerings_org_status_start' },
      ]),
    ]).catch((error) => { provision = undefined; throw error; });
  }
  return provision;
}

async function writeNewEntity(db, user, organizationId, collection, action, entity) {
  const now = new Date().toISOString();
  await runInTransaction(db, async (session) => {
    await db.collection(collection).insertOne(entity, { session });
    await db.collection('audit_logs').insertOne(auditRecord(organizationId, user, action, entity.id, now), { session });
    await db.collection('outbox_events').insertOne(outboxRecord(organizationId, action, entity, now), { session });
  });
  return stripId(entity);
}

export async function createProgram(db, user, organizationId, input) {
  const now = new Date().toISOString();
  const entity = createAcademicProgram({ id: uuidv4(), organizationId, input, actorId: user.id, now });
  return writeNewEntity(db, user, organizationId, 'academic_programs', 'program.created', entity);
}
export async function createOffering(db, user, organizationId, input) {
  const program = await db.collection('academic_programs').findOne({ id: input.program_id, organization_id: organizationId, status: { $ne: 'archived' } });
  if (!program) throw new ProgramDomainError('Canonical Program not found', 404);
  const now = new Date().toISOString();
  const entity = createProgramOffering({ id: uuidv4(), organizationId, input, actorId: user.id, now });
  return writeNewEntity(db, user, organizationId, 'program_offerings', 'program_offering.created', entity);
}
export async function updateEntity(db, user, collection, entity, input, kind) {
  const now = new Date().toISOString();
  const updated = kind === 'program' ? updateAcademicProgram(entity, { input, actorId: user.id, now }) : updateProgramOffering(entity, { input, actorId: user.id, now });
  await runInTransaction(db, async (session) => {
    await db.collection(collection).replaceOne({ id: entity.id, organization_id: entity.organization_id }, updated, { session });
    await db.collection('audit_logs').insertOne(auditRecord(entity.organization_id, user, kind + '.updated', entity.id, now, { fields: Object.keys(input) }), { session });
    await db.collection('outbox_events').insertOne(outboxRecord(entity.organization_id, kind + '.updated', updated, now), { session });
  });
  return stripId(updated);
}
export async function transitionEntity(db, user, collection, entity, status, kind) {
  const now = new Date().toISOString();
  const updated = transitionProgramEntity(entity, { status, actorId: user.id, now });
  await runInTransaction(db, async (session) => {
    await db.collection(collection).replaceOne({ id: entity.id, organization_id: entity.organization_id }, updated, { session });
    await db.collection('audit_logs').insertOne(auditRecord(entity.organization_id, user, kind + '.status_changed', entity.id, now, { status }), { session });
    await db.collection('outbox_events').insertOne(outboxRecord(entity.organization_id, kind + '.status_changed', updated, now), { session });
  });
  return stripId(updated);
}
