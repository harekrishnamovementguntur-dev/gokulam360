import { v4 as uuidv4 } from 'uuid';
import {
  AttendanceDomainError,
  createAttendanceRecord,
  correctionInput,
  creditDebitFor,
  creditPolicyFor,
  voidInput,
} from '../../../lib/attendance-domain.mjs';
import { createLedgerEntry } from '../../../lib/credit-ledger-domain.mjs';
import { ensureIndexByKey } from '../../../lib/mongo-indexes.mjs';
import { runInTransaction, stripId } from './server.js';

let infrastructurePromise;

export async function ensureAttendanceInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = Promise.all([
      db.collection('attendance_records').createIndexes([
        {
          key: { organization_id: 1, session_id: 1, membership_term_participation_id: 1 },
          unique: true,
          partialFilterExpression: { event_type: 'recorded' },
          name: 'attendance_initial_session_participation_unique',
        },
        { key: { organization_id: 1, session_id: 1, membership_term_participation_id: 1, revision: -1 }, name: 'attendance_revision_timeline' },
        { key: { organization_id: 1, membership_id: 1, recorded_at: -1 }, name: 'attendance_membership_timeline' },
        { key: { organization_id: 1, term_id: 1, recorded_at: -1 }, name: 'attendance_term_timeline' },
      ]),
      db.collection('attendance_command_receipts').createIndexes([
        { key: { organization_id: 1, idempotency_key: 1 }, unique: true, name: 'attendance_idempotency_unique' },
      ]),
      ensureIndexByKey(
        db.collection('audit_logs'),
        { organization_id: 1, entity_type: 1, entity_id: 1, created_at: -1 },
        { name: 'audit_logs_by_attendance_entity' },
      ),
      ensureIndexByKey(
        db.collection('outbox_events'),
        { organization_id: 1, aggregate_type: 1, aggregate_id: 1, occurred_at: 1 },
        { name: 'outbox_events_by_attendance_aggregate' },
      ),
    ]).catch((error) => {
      infrastructurePromise = undefined;
      throw error;
    });
  }
  return infrastructurePromise;
}

const auditDocument = (record, user, action, now, details = {}) => ({
  id: uuidv4(),
  organization_id: record.organization_id,
  entity_type: 'attendance_record',
  entity_id: record.id,
  action,
  actor_id: user.id,
  actor_name: user.name || '',
  details,
  created_at: now,
});

const outboxDocument = (record, eventType, now, details = {}) => ({
  id: uuidv4(),
  organization_id: record.organization_id,
  aggregate_type: 'attendance_record',
  aggregate_id: record.id,
  event_type: eventType,
  payload: {
    attendance_record_id: record.id,
    session_id: record.session_id,
    membership_term_participation_id: record.membership_term_participation_id,
    membership_id: record.membership_id,
    status: record.status,
    event_type: record.event_type,
    ...details,
  },
  status: 'pending',
  occurred_at: now,
  created_at: now,
});

async function references(db, organizationId, input) {
  const session = await db.collection('academic_sessions').findOne({
    id: input.session_id,
    organization_id: organizationId,
  });
  if (!session) throw new AttendanceDomainError('Session not found in this organization', 404);

  const participation = await db.collection('membership_term_participations').findOne({
    id: input.membership_term_participation_id,
    organization_id: organizationId,
    status: 'active',
  });
  if (!participation) throw new AttendanceDomainError('An active Membership Term Participation is required', 422);
  if (participation.term_id !== session.term_id) {
    throw new AttendanceDomainError('Session and Participation must belong to the same Term', 422);
  }

  const offering = await db.collection('program_offerings').findOne({
    id: participation.program_offering_id,
    organization_id: organizationId,
    status: { $ne: 'archived' },
  });
  if (!offering) throw new AttendanceDomainError('Program Offering not found in this organization', 404);
  return { session, participation, offering };
}

async function latestRecord(db, organizationId, sessionId, participationId, session = null) {
  return db.collection('attendance_records').findOne(
    {
      organization_id: organizationId,
      session_id: sessionId,
      membership_term_participation_id: participationId,
    },
    { sort: { revision: -1, created_at: -1 }, ...(session ? { session } : {}) },
  );
}

const debitFor = (record, offering) => record
  ? creditDebitFor(record.status, creditPolicyFor(offering))
  : 0;

export function ledgerDelta(previous, next, offering) {
  return debitFor(next, offering) - debitFor(previous, offering);
}

async function writeAttendanceMutation(db, user, organizationId, record, previous, offering, idempotencyKey, action) {
  const commandId = uuidv4();
  const now = record.created_at;
  return runInTransaction(db, async (session) => {
    const receipt = await db.collection('attendance_command_receipts').findOne(
      { organization_id: organizationId, idempotency_key: idempotencyKey },
      { session },
    );
    if (receipt) return receipt.response;

    const delta = ledgerDelta(previous, record, offering);
    if (delta !== 0) {
      const ledgerEntry = createLedgerEntry({
        id: uuidv4(),
        organizationId,
        membershipId: record.membership_id,
        quantityDelta: delta,
        reasonCode: previous ? 'attendance_correction' : 'attendance_consumption',
        description: action,
        sourceType: 'attendance_record',
        sourceId: record.id,
        actorId: user.id,
        now,
        commandId,
      });
      await db.collection('credit_ledger_entries').insertOne(ledgerEntry, { session });
    }

    await db.collection('attendance_records').insertOne(record, { session });
    await db.collection('audit_logs').insertOne(
      auditDocument(record, user, action, now, {
        previous_record_id: previous?.id || null,
        source_session_id: record.session_id,
        source_participation_id: record.membership_term_participation_id,
        credit_delta: delta,
      }),
      { session },
    );
    await db.collection('outbox_events').insertOne(
      outboxDocument(record, action, now, { credit_delta: delta }),
      { session },
    );

    const response = stripId({ ...record, credit_delta: delta });
    await db.collection('attendance_command_receipts').insertOne({
      id: uuidv4(),
      organization_id: organizationId,
      idempotency_key: idempotencyKey,
      command_id: commandId,
      response,
      created_at: now,
    }, { session });
    return response;
  });
}

function idempotencyKey(value) {
  const key = String(value || '').trim();
  if (!key) throw new AttendanceDomainError('Idempotency-Key header is required', 400);
  return key;
}

export async function listAttendanceRecords({ db, organizationId, filters }) {
  const filter = { organization_id: organizationId, ...filters };
  const records = await db.collection('attendance_records')
    .find(filter)
    .sort({ recorded_at: -1, revision: -1 })
    .toArray();
  return records.map(stripId);
}

export async function getAttendanceRecord({ db, organizationId, id }) {
  const record = await db.collection('attendance_records').findOne({
    id,
    organization_id: organizationId,
  });
  if (!record) throw new AttendanceDomainError('Attendance Record not found', 404);
  return stripId(record);
}

export async function createAttendanceCommand({ db, user, organizationId, body, requestIdempotencyKey }) {
  const key = idempotencyKey(requestIdempotencyKey);
  const input = {
    session_id: String(body?.session_id || ''),
    membership_term_participation_id: String(body?.membership_term_participation_id || ''),
    status: body?.status,
    notes: body?.notes,
  };
  const referencesResult = await references(db, organizationId, input);
  const duplicate = await db.collection('attendance_records').findOne({
    organization_id: organizationId,
    session_id: input.session_id,
    membership_term_participation_id: input.membership_term_participation_id,
    event_type: 'recorded',
  });
  if (duplicate) throw new AttendanceDomainError('Attendance already exists for this Session and Participation', 409);

  const now = new Date().toISOString();
  const record = createAttendanceRecord({
    id: uuidv4(),
    organizationId,
    session: referencesResult.session,
    participation: referencesResult.participation,
    input,
    actorId: user.id,
    now,
  });
  return writeAttendanceMutation(db, user, organizationId, record, null, referencesResult.offering, key, 'attendance.recorded');
}

export async function correctAttendanceCommand({ db, user, organizationId, id, body, requestIdempotencyKey, voidRecord = false }) {
  const key = idempotencyKey(requestIdempotencyKey);
  const current = await db.collection('attendance_records').findOne({
    id,
    organization_id: organizationId,
  });
  if (!current) throw new AttendanceDomainError('Attendance Record not found', 404);
  if (current.event_type === 'voided') throw new AttendanceDomainError('A voided Attendance Record cannot be corrected', 409);

  const refs = await references(db, organizationId, {
    session_id: current.session_id,
    membership_term_participation_id: current.membership_term_participation_id,
  });
  const previous = await latestRecord(db, organizationId, current.session_id, current.membership_term_participation_id);
  if (!previous || previous.id !== current.id) {
    throw new AttendanceDomainError('Only the latest Attendance Record can be corrected', 409);
  }
  const input = voidRecord ? voidInput(body) : correctionInput(body);
  const now = new Date().toISOString();
  const record = createAttendanceRecord({
    id: uuidv4(),
    organizationId,
    session: refs.session,
    participation: refs.participation,
    input,
    actorId: user.id,
    now,
    eventType: voidRecord ? 'voided' : 'corrected',
    supersedesRecordId: current.id,
    revision: Number(current.revision || 1) + 1,
  });
  return writeAttendanceMutation(
    db,
    user,
    organizationId,
    record,
    current,
    refs.offering,
    key,
    voidRecord ? 'attendance.voided' : 'attendance.corrected',
  );
}
