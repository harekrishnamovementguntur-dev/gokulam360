import { v4 as uuidv4 } from 'uuid';
import {
  AcademicCalendarError,
  createTerm,
  updateTerm,
  transitionTerm,
  createSession,
  updateSession,
  transitionSession,
  generationCandidates,
} from '../../../lib/academic-calendar-domain.mjs';
import { runInTransaction, stripId } from './server.js';

let infrastructurePromise;
export async function ensureAcademicCalendarInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = Promise.all([
      db.collection('academic_terms').createIndexes([
        { key: { organization_id: 1, program_offering_id: 1, display_order: 1 }, name: 'terms_offering_order' },
        { key: { organization_id: 1, status: 1, start_date: 1 }, name: 'terms_status_start' },
      ]),
      db.collection('academic_sessions').createIndexes([
        { key: { organization_id: 1, term_id: 1, date: 1 }, unique: true, name: 'sessions_term_date' },
        { key: { organization_id: 1, term_id: 1, session_number: 1 }, unique: true, name: 'sessions_term_number' },
        { key: { organization_id: 1, status: 1, date: 1 }, name: 'sessions_status_date' },
      ]),
      db.collection('academic_session_generation_runs').createIndexes([
        { key: { organization_id: 1, term_id: 1, created_at: -1 }, name: 'generation_runs_term_created' },
      ]),
    ]).catch((error) => { infrastructurePromise = undefined; throw error; });
  }
  return infrastructurePromise;
}

const audit = (organizationId, user, action, entityId, now, details = {}) => ({
  id: uuidv4(), organization_id: organizationId, action, entity_id: entityId,
  entity_type: action.split('.')[0], actor_id: user.id, actor_name: user.name || '',
  created_at: now, details,
});
const outbox = (organizationId, eventType, entityId, now, payload = {}) => ({
  id: uuidv4(), organization_id: organizationId, event_type: eventType,
  aggregate_id: entityId, payload, created_at: now, published_at: null,
});

async function writeEntity(db, user, collection, entity, action) {
  const now = new Date().toISOString();
  await runInTransaction(db, async (session) => {
    await db.collection(collection).insertOne(entity, { session });
    await db.collection('audit_logs').insertOne(audit(entity.organization_id, user, action, entity.id, now), { session });
    await db.collection('outbox_events').insertOne(outbox(entity.organization_id, action, entity.id, now), { session });
  });
  return stripId(entity);
}
async function replaceEntity(db, user, collection, entity, updated, action, details = {}) {
  const now = new Date().toISOString();
  await runInTransaction(db, async (session) => {
    await db.collection(collection).replaceOne({ id: entity.id, organization_id: entity.organization_id }, updated, { session });
    await db.collection('audit_logs').insertOne(audit(entity.organization_id, user, action, entity.id, now, details), { session });
    await db.collection('outbox_events').insertOne(outbox(entity.organization_id, action, entity.id, now, { fields: Object.keys(details.fields || {}) }), { session });
  });
  return stripId(updated);
}

export async function createAcademicTerm(db, user, organizationId, input) {
  const offering = await db.collection('program_offerings').findOne({ id: input.program_offering_id, organization_id: organizationId, status: { $ne: 'archived' } });
  if (!offering) throw new AcademicCalendarError('Program Offering not found', 404);
  const now = new Date().toISOString();
  return writeEntity(db, user, 'academic_terms', createTerm({ id: uuidv4(), organizationId, input, actorId: user.id, now }), 'term.created');
}
export async function updateAcademicTerm(db, user, term, input) {
  const now = new Date().toISOString();
  return replaceEntity(db, user, 'academic_terms', term, updateTerm(term, { input, actorId: user.id, now }), 'term.updated', { fields: input });
}
export async function transitionAcademicTerm(db, user, term, nextStatus) {
  const now = new Date().toISOString();
  return replaceEntity(db, user, 'academic_terms', term, transitionTerm(term, { status: nextStatus, actorId: user.id, now }), 'term.status_changed', { fields: { status: nextStatus } });
}

export async function createAcademicSession(db, user, organizationId, input) {
  const term = await db.collection('academic_terms').findOne({ id: input.term_id, organization_id: organizationId, status: { $ne: 'archived' } });
  if (!term) throw new AcademicCalendarError('Term not found', 404);
  if (input.date < term.start_date || input.date > term.end_date) throw new AcademicCalendarError('Session date must be within the Term date range');
  const existing = await db.collection('academic_sessions').find({ term_id: term.id, organization_id: organizationId }).sort({ session_number: -1 }).limit(1).toArray();
  const now = new Date().toISOString();
  const nextNumber = (existing[0]?.session_number || 0) + 1;
  return writeEntity(db, user, 'academic_sessions', createSession({ id: uuidv4(), organizationId, input, actorId: user.id, now, source: 'manual', sessionNumber: nextNumber }), 'session.created');
}
export async function updateAcademicSession(db, user, session, input) {
  const term = await db.collection('academic_terms').findOne({ id: session.term_id, organization_id: session.organization_id });
  if (!term) throw new AcademicCalendarError('Term not found', 404);
  const now = new Date().toISOString();
  const updated = updateSession(session, { input, actorId: user.id, now });
  if (updated.date < term.start_date || updated.date > term.end_date) throw new AcademicCalendarError('Session date must be within the Term date range');
  return replaceEntity(db, user, 'academic_sessions', session, updated, 'session.updated', { fields: input });
}
export async function transitionAcademicSession(db, user, session, nextStatus, details = {}) {
  const term = await db.collection('academic_terms').findOne({ id: session.term_id, organization_id: session.organization_id });
  if (!term) throw new AcademicCalendarError('Term not found', 404);
  if (details.new_date && (details.new_date < term.start_date || details.new_date > term.end_date)) throw new AcademicCalendarError('Rescheduled date must be within the Term date range');
  const now = new Date().toISOString();
  return replaceEntity(db, user, 'academic_sessions', session, transitionSession(session, { status: nextStatus, actorId: user.id, now, details }), 'session.status_changed', { fields: { status: nextStatus, ...details } });
}

export async function previewAcademicSessionGeneration(db, organizationId, input) {
  const term = await db.collection('academic_terms').findOne({ id: input.term_id, organization_id: organizationId });
  if (!term) throw new AcademicCalendarError('Term not found', 404);
  const sessions = await db.collection('academic_sessions').find({ term_id: term.id, organization_id: organizationId }).sort({ session_number: 1 }).toArray();
  return { term: stripId(term), ...generationCandidates(term, input, sessions), existing_count: sessions.length };
}

export async function generateAcademicSessions(db, user, organizationId, input) {
  const preview = await previewAcademicSessionGeneration(db, organizationId, input);
  const toCreate = preview.candidates.filter((candidate) => candidate.action === 'create');
  const now = new Date().toISOString();
  const run = {
    id: uuidv4(), organization_id: organizationId, term_id: input.term_id,
    configuration: preview.configuration, preview_count: preview.candidates.length,
    created_count: toCreate.length, preserved_count: preview.preserved.length,
    created_session_ids: toCreate.map(() => uuidv4()), created_at: now, created_by: user.id,
  };
  const createdSessions = toCreate.map((candidate, index) => createSession({
    id: run.created_session_ids[index], organizationId,
    input: { term_id: input.term_id, date: candidate.date, start_time: preview.configuration.start_time, end_time: preview.configuration.end_time, notes: '', topic: '', reference: '', generation_key: input.term_id + ':' + candidate.date },
    actorId: user.id, now, source: 'generated', sessionNumber: candidate.session_number,
  }));
  await runInTransaction(db, async (session) => {
    if (createdSessions.length) await db.collection('academic_sessions').insertMany(createdSessions, { session, ordered: true });
    await db.collection('academic_session_generation_runs').insertOne(run, { session });
    await db.collection('audit_logs').insertOne(audit(organizationId, user, 'session_generation.completed', input.term_id, now, { created_count: createdSessions.length, preserved_count: run.preserved_count }), { session });
    await db.collection('outbox_events').insertOne(outbox(organizationId, 'session_generation.completed', input.term_id, now, { generation_run_id: run.id }), { session });
  });
  return { run: stripId(run), created: createdSessions.map(stripId), preserved: preview.preserved, excluded: preview.excluded, holidays: preview.holidays };
}
