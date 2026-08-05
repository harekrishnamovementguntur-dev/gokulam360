import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { createAcademicProgram, createProgramOffering } from '../lib/program-domain.mjs';
import { createTerm, createSession } from '../lib/academic-calendar-domain.mjs';
import { createMembership } from '../lib/membership-domain.mjs';
import { createParticipation } from '../lib/membership-term-participation-domain.mjs';
import { createPayment } from '../lib/payment-domain.mjs';
import { createLedgerEntry } from '../lib/credit-ledger-domain.mjs';
import { createAttendanceRecord } from '../lib/attendance-domain.mjs';

const SEED_KEY = 'pilot-demo-v1';
const ACTOR_ID = 'pilot-demo-seed';
const ORGANIZATION_ID = 'pilot-demo-organization';
const PROGRAM_ID = 'pilot-demo-program';
const OFFERING_ID = 'pilot-demo-offering';
const TERM_ID = 'pilot-demo-term';
const ADMIN_ID = 'pilot-demo-admin';
const ADMIN_EMAIL = 'pilot-admin@gokulam360.test';
const ADMIN_PASSWORD = 'PilotDemo!2026';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  throw new Error('The Pilot Demo Seed cannot run in a production environment');
}
if (process.env.ALLOW_PILOT_DEMO_SEED !== 'true') {
  throw new Error('Set ALLOW_PILOT_DEMO_SEED=true to enable the Pilot Demo Seed');
}
if (process.env.PILOT_DEMO_SEED_CONFIRM !== SEED_KEY) {
  throw new Error('Set PILOT_DEMO_SEED_CONFIRM=pilot-demo-v1 to confirm the Pilot Demo Seed');
}
if (!process.env.PILOT_DEMO_DB_NAME || !process.env.PILOT_DEMO_DB_NAME.startsWith('gokulam360_pilot')) {
  throw new Error('Set PILOT_DEMO_DB_NAME to a dedicated database beginning with gokulam360_pilot');
}
if (!process.env.MONGO_URL) throw new Error('MONGO_URL must be configured');

const dbName = process.env.PILOT_DEMO_DB_NAME;
const now = new Date().toISOString();
const metadata = { demo_seed_key: SEED_KEY };

const organization = {
  id: ORGANIZATION_ID,
  name: 'Gokulam360 Pilot Temple',
  display_name: 'Gokulam360 Pilot Temple',
  status: 'active',
  metadata,
  created_at: now,
  updated_at: now,
};

const program = createAcademicProgram({
  id: PROGRAM_ID,
  organizationId: ORGANIZATION_ID,
  actorId: ACTOR_ID,
  now,
  input: {
    name: 'Sunday School Pilot',
    description: 'Canonical pilot fixture for Administrator workflow verification.',
    age_group: '6-14',
    status: 'active',
    metadata,
  },
});

const offering = {
  ...createProgramOffering({
    id: OFFERING_ID,
    organizationId: ORGANIZATION_ID,
    actorId: ACTOR_ID,
    now,
    input: {
      program_id: PROGRAM_ID,
      academic_year: '2026-2027',
      cohort: 'Pilot Cohort',
      start_date: '2026-08-01',
      end_date: '2026-09-30',
      capacity: 5,
      status: 'active',
      schedule: { weekdays: [0], start_time: '09:00', end_time: '10:30' },
      metadata,
    },
  }),
  attendance_policy: { credit_consumption_enabled: true, credits_per_attendance: 1 },
};

const term = createTerm({
  id: TERM_ID,
  organizationId: ORGANIZATION_ID,
  actorId: ACTOR_ID,
  now,
  input: {
    program_offering_id: OFFERING_ID,
    name: 'Pilot Term',
    display_order: 1,
    start_date: '2026-08-01',
    end_date: '2026-09-30',
    status: 'active',
  },
});

const sessionDates = ['2026-08-09', '2026-08-16', '2026-08-23'];
const sessions = sessionDates.map((date, index) => createSession({
  id: `pilot-demo-session-${index + 1}`,
  organizationId: ORGANIZATION_ID,
  actorId: ACTOR_ID,
  now,
  source: 'generated',
  sessionNumber: index + 1,
  input: {
    term_id: TERM_ID,
    date,
    start_time: '09:00',
    end_time: '10:30',
    status: 'scheduled',
    topic: `Pilot Session ${index + 1}`,
    reference: 'pilot-demo-v1',
    notes: 'Deterministic development fixture session.',
    generation_key: `${TERM_ID}:${date}`,
  },
}));

const students = Array.from({ length: 5 }, (_, index) => ({
  id: `pilot-demo-student-${index + 1}`,
  organization_id: ORGANIZATION_ID,
  first_name: 'Pilot',
  last_name: `Student ${index + 1}`,
  student_id: `PILOT-${String(index + 1).padStart(3, '0')}`,
  status: 'active',
  is_deleted: false,
  metadata,
  created_at: now,
  updated_at: now,
}));

const memberships = students.map((student, index) => createMembership({
  id: `pilot-demo-membership-${index + 1}`,
  organizationId: ORGANIZATION_ID,
  studentId: student.id,
  programId: PROGRAM_ID,
  status: 'active',
  actorId: ACTOR_ID,
  now,
  metadata,
}));

const participations = memberships.map((membership, index) => createParticipation({
  id: `pilot-demo-participation-${index + 1}`,
  organizationId: ORGANIZATION_ID,
  membershipId: membership.id,
  programOfferingId: OFFERING_ID,
  termId: TERM_ID,
  actorId: ACTOR_ID,
  now,
}));

const postedPayment = createPayment({
  id: 'pilot-demo-payment-posted',
  organizationId: ORGANIZATION_ID,
  amountMinor: 250000,
  currency: 'INR',
  method: 'upi',
  description: 'Posted pilot payment',
  receiptNumber: 'PILOT-2026-001',
  actorId: ACTOR_ID,
  now,
  idempotencyKey: 'pilot-demo-payment-posted-key',
});
postedPayment.status = 'posted';
postedPayment.posted_at = now;
postedPayment.updated_at = now;

const draftPayment = createPayment({
  id: 'pilot-demo-payment-draft',
  organizationId: ORGANIZATION_ID,
  amountMinor: 100000,
  currency: 'INR',
  method: 'cash',
  description: 'Draft pilot payment',
  receiptNumber: 'PILOT-2026-002',
  actorId: ACTOR_ID,
  now,
  idempotencyKey: 'pilot-demo-payment-draft-key',
});

const postedAllocation = {
  id: 'pilot-demo-allocation-posted',
  organization_id: ORGANIZATION_ID,
  payment_transaction_id: postedPayment.id,
  membership_id: memberships[0].id,
  amount_minor: postedPayment.amount_minor,
  credit_quantity: 10,
  allocation_type: 'payment',
  status: 'posted',
  description: 'Pilot credit purchase allocation',
  created_by: ACTOR_ID,
  created_at: now,
};

const paymentLedgerEntry = createLedgerEntry({
  id: 'pilot-demo-ledger-payment',
  organizationId: ORGANIZATION_ID,
  membershipId: memberships[0].id,
  quantityDelta: 10,
  reasonCode: 'credit_purchase',
  description: 'Credits granted from posted pilot payment',
  sourceType: 'payment_allocation',
  sourceId: postedAllocation.id,
  actorId: ACTOR_ID,
  now,
  commandId: 'pilot-demo-payment-posted-command',
});

const attendanceInputs = [
  { sessionIndex: 0, participationIndex: 0, status: 'present', notes: 'Pilot present record' },
  { sessionIndex: 0, participationIndex: 1, status: 'late', notes: 'Pilot late record' },
  { sessionIndex: 1, participationIndex: 2, status: 'absent', notes: 'Pilot absent record' },
  { sessionIndex: 1, participationIndex: 3, status: 'excused', notes: 'Pilot excused record' },
];

const attendanceRecords = attendanceInputs.map((item, index) => createAttendanceRecord({
  id: `pilot-demo-attendance-${index + 1}`,
  organizationId: ORGANIZATION_ID,
  session: sessions[item.sessionIndex],
  participation: participations[item.participationIndex],
  input: { status: item.status, notes: item.notes },
  actorId: ACTOR_ID,
  now,
}));

const attendanceLedgerEntry = createLedgerEntry({
  id: 'pilot-demo-ledger-attendance',
  organizationId: ORGANIZATION_ID,
  membershipId: memberships[0].id,
  quantityDelta: -1,
  reasonCode: 'attendance_consumption',
  description: 'Credit consumed by pilot Present attendance',
  sourceType: 'attendance_record',
  sourceId: attendanceRecords[0].id,
  actorId: ACTOR_ID,
  now,
  commandId: 'pilot-demo-attendance-command',
});

const auditLogs = [
  { id: 'pilot-demo-audit-payment', organization_id: ORGANIZATION_ID, entity_type: 'payment_transaction', entity_id: postedPayment.id, action: 'payment.posted', actor_id: ACTOR_ID, actor_name: 'Pilot Demo Seed', details: { fixture: SEED_KEY }, created_at: now },
  ...attendanceRecords.map((record) => ({
    id: `pilot-demo-audit-${record.id}`,
    organization_id: ORGANIZATION_ID,
    entity_type: 'attendance_record',
    entity_id: record.id,
    action: 'attendance.recorded',
    actor_id: ACTOR_ID,
    actor_name: 'Pilot Demo Seed',
    details: { fixture: SEED_KEY, status: record.status },
    created_at: now,
  })),
];

const outboxEvents = [
  { id: 'pilot-demo-outbox-payment', organization_id: ORGANIZATION_ID, aggregate_type: 'payment_transaction', aggregate_id: postedPayment.id, event_type: 'payment.posted', payload: { payment_id: postedPayment.id, fixture: SEED_KEY }, status: 'pending', occurred_at: now, created_at: now },
  ...attendanceRecords.map((record) => ({
    id: `pilot-demo-outbox-${record.id}`,
    organization_id: ORGANIZATION_ID,
    aggregate_type: 'attendance_record',
    aggregate_id: record.id,
    event_type: 'attendance.recorded',
    payload: { attendance_record_id: record.id, status: record.status, fixture: SEED_KEY },
    status: 'pending',
    occurred_at: now,
    created_at: now,
  })),
];

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
const users = [{
  id: ADMIN_ID,
  email: ADMIN_EMAIL,
  password_hash: passwordHash,
  name: 'Pilot Organization Admin',
  role: 'org_admin',
  organization_id: ORGANIZATION_ID,
  created_at: now,
  updated_at: now,
}];

const collections = {
  organizations: [organization],
  users,
  academic_programs: [program],
  program_offerings: [offering],
  academic_terms: [term],
  academic_sessions: sessions,
  students,
  memberships,
  membership_term_participations: participations,
  payment_transactions: [postedPayment, draftPayment],
  payment_allocations: [postedAllocation],
  credit_ledger_entries: [paymentLedgerEntry, attendanceLedgerEntry],
  attendance_records: attendanceRecords,
  audit_logs: auditLogs,
  outbox_events: outboxEvents,
};

const client = new MongoClient(process.env.MONGO_URL);
try {
  await client.connect();
  const db = client.db(dbName);

  for (const [collectionName, documents] of Object.entries(collections)) {
    const collection = db.collection(collectionName);
    for (const document of documents) {
      await collection.replaceOne(
        { id: document.id, demo_seed_key: SEED_KEY },
        { ...document, demo_seed_key: SEED_KEY },
        { upsert: true },
      );
    }
  }

  console.log(JSON.stringify({
    seed: SEED_KEY,
    database: dbName,
    credentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    organization_id: ORGANIZATION_ID,
    counts: Object.fromEntries(Object.entries(collections).map(([name, docs]) => [name, docs.length])),
    note: 'Re-running replaces only deterministic Pilot Demo records in the dedicated pilot database.',
  }, null, 2));
} finally {
  await client.close();
}
