import { MongoClient } from 'mongodb';
import { createAcademicProgram, createProgramOffering } from '../lib/program-domain.mjs';
import { createTerm, createSession } from '../lib/academic-calendar-domain.mjs';
import { createMembership } from '../lib/membership-domain.mjs';
import { createParticipation } from '../lib/membership-term-participation-domain.mjs';

const SEED_KEY = 'attendance-demo-v1';
const ACTOR_ID = 'attendance-demo-seed';
const organizationId = 'demo-attendance-organization';
const programId = 'demo-attendance-program';
const offeringId = 'demo-attendance-offering';
const termId = 'demo-attendance-term';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The Attendance demo seed cannot run when NODE_ENV=production');
}
if (process.env.ALLOW_DEMO_SEED !== 'true' || process.env.ATTENDANCE_DEMO_SEED_CONFIRM !== SEED_KEY) {
  throw new Error(
    'Refusing to seed. Set ALLOW_DEMO_SEED=true and ATTENDANCE_DEMO_SEED_CONFIRM=attendance-demo-v1 for a development database.',
  );
}
if (!process.env.MONGO_URL) throw new Error('MONGO_URL must be configured');
const dbName = process.env.DB_NAME || 'gokulam360';

const now = new Date().toISOString();
const metadata = { demo_seed_key: SEED_KEY };

const organization = {
  id: organizationId,
  name: 'Gokulam360 Attendance Demo',
  display_name: 'Gokulam360 Attendance Demo',
  status: 'active',
  metadata,
  created_at: now,
  updated_at: now,
};

const program = createAcademicProgram({
  id: programId,
  organizationId,
  actorId: ACTOR_ID,
  now,
  input: {
    name: 'Sunday School Demo',
    description: 'Development fixture for canonical Attendance verification.',
    age_group: '6-12',
    status: 'active',
    metadata,
  },
});

const offering = {
  ...createProgramOffering({
    id: offeringId,
    organizationId,
    actorId: ACTOR_ID,
    now,
    input: {
      program_id: programId,
      academic_year: '2026-2027',
      cohort: 'Attendance Demo',
      start_date: '2026-08-01',
      end_date: '2026-09-30',
      capacity: 5,
      status: 'active',
      schedule: { weekdays: [0], start_time: '09:00', end_time: '10:30' },
      metadata: { ...metadata, attendance_policy: { credit_consumption_enabled: true, credits_per_attendance: 1 } },
    },
  }),
  attendance_policy: { credit_consumption_enabled: true, credits_per_attendance: 1 },
};

const term = createTerm({
  id: termId,
  organizationId,
  actorId: ACTOR_ID,
  now,
  input: {
    program_offering_id: offeringId,
    name: 'Demo Term',
    display_order: 1,
    start_date: '2026-08-01',
    end_date: '2026-09-30',
    status: 'active',
  },
});

const sessionDates = ['2026-08-02', '2026-08-09', '2026-08-16'];
const sessions = sessionDates.map((date, index) => createSession({
  id: `demo-attendance-session-${index + 1}`,
  organizationId,
  actorId: ACTOR_ID,
  now,
  source: 'generated',
  sessionNumber: index + 1,
  input: {
    term_id: termId,
    date,
    start_time: '09:00',
    end_time: '10:30',
    status: 'scheduled',
    topic: `Demo Session ${index + 1}`,
    reference: 'attendance-demo',
    notes: 'Development fixture session.',
    generation_key: `${termId}:${date}`,
  },
}));

const students = Array.from({ length: 5 }, (_, index) => ({
  id: `demo-attendance-student-${index + 1}`,
  organization_id: organizationId,
  first_name: 'Demo',
  last_name: `Student ${index + 1}`,
  student_id: `ATT-DEMO-${String(index + 1).padStart(3, '0')}`,
  status: 'active',
  is_deleted: false,
  metadata,
  created_at: now,
  updated_at: now,
}));

const memberships = students.map((student, index) => createMembership({
  id: `demo-attendance-membership-${index + 1}`,
  organizationId,
  studentId: student.id,
  programId,
  status: 'active',
  actorId: ACTOR_ID,
  now,
  metadata,
}));

const participations = memberships.map((membership, index) => createParticipation({
  id: `demo-attendance-participation-${index + 1}`,
  organizationId,
  membershipId: membership.id,
  programOfferingId: offeringId,
  termId,
  actorId: ACTOR_ID,
  now,
}));

const collections = {
  organizations: [organization],
  academic_programs: [program],
  program_offerings: [offering],
  academic_terms: [term],
  academic_sessions: sessions,
  students,
  memberships,
  membership_term_participations: participations,
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
    organization_id: organizationId,
    program_id: programId,
    program_offering_id: offeringId,
    term_id: termId,
    counts: Object.fromEntries(Object.keys(collections).map((name) => [name, collections[name].length])),
    note: 'Existing demo records are preserved by deterministic IDs; no production path invokes this script.',
  }, null, 2));
} finally {
  await client.close();
}
