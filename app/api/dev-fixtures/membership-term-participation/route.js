import { v4 as uuidv4 } from 'uuid';
import {
  apiErrorResponse,
  getDb,
  json,
  requireUser,
  resolveOrganizationId,
  runInTransaction,
  stripId,
} from '../../_lib/server.js';
import { ensureMembershipInfrastructure, createMembershipCommand, transitionMembershipCommand } from '../../_lib/memberships.js';
import { ensureProgramInfrastructure } from '../../_lib/program-offerings.js';
import { ensureAcademicCalendarInfrastructure, createAcademicTerm } from '../../_lib/academic-calendar.js';
import { createAcademicProgram, createProgramOffering } from '../../../../lib/program-domain.mjs';

const FIXTURE_PREFIX = 'pr16-fixture';

function fixtureEnabled() {
  return process.env.ENABLE_DEV_FIXTURES === 'true' || process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV !== 'production';
}

function audit(organizationId, user, action, entityId, now, details = {}) {
  return {
    id: uuidv4(),
    organization_id: organizationId,
    entity_type: action.split('.')[0],
    entity_id: entityId,
    action,
    actor_id: user.id,
    actor_name: user.name || '',
    details,
    created_at: now,
  };
}

function outbox(organizationId, eventType, entityId, now) {
  return {
    id: uuidv4(),
    organization_id: organizationId,
    aggregate_type: eventType.split('.')[0],
    aggregate_id: entityId,
    event_type: eventType,
    payload: { id: entityId, organization_id: organizationId },
    status: 'pending',
    occurred_at: now,
    created_at: now,
  };
}

async function createCanonicalRecord(db, user, collection, entity, action) {
  const now = new Date().toISOString();
  await runInTransaction(db, async (session) => {
    await db.collection(collection).insertOne(entity, { session });
    await db.collection('audit_logs').insertOne(
      audit(entity.organization_id, user, action, entity.id, now),
      { session },
    );
    await db.collection('outbox_events').insertOne(
      outbox(entity.organization_id, action, entity.id, now),
      { session },
    );
  });
  return stripId(entity);
}

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;
  if (!fixtureEnabled()) return json({ error: 'Development fixtures are disabled' }, 404);

  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));
    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    await Promise.all([
      ensureMembershipInfrastructure(db),
      ensureProgramInfrastructure(db),
      ensureAcademicCalendarInfrastructure(db),
    ]);

    const students = db.collection('students');
    const legacyPrograms = db.collection('programs');
    const memberships = db.collection('memberships');
    const canonicalPrograms = db.collection('academic_programs');
    const offerings = db.collection('program_offerings');
    const terms = db.collection('academic_terms');

    let membership = await memberships.findOne({
      organization_id: organizationId,
      status: 'active',
    });

    if (!membership) {
      const studentId = `${FIXTURE_PREFIX}-student-${organizationId}`;
      const programId = `${FIXTURE_PREFIX}-program-${organizationId}`;
      const now = new Date().toISOString();

      await students.updateOne(
        { id: studentId, organization_id: organizationId },
        {
          $setOnInsert: {
            id: studentId,
            organization_id: organizationId,
            first_name: 'PR16',
            last_name: 'Participation Fixture Student',
            name: 'PR16 Participation Fixture Student',
            email: 'pr16-fixture@example.invalid',
            status: 'active',
            is_deleted: false,
            created_at: now,
            updated_at: now,
          },
        },
        { upsert: true },
      );
      await legacyPrograms.updateOne(
        { id: programId, organization_id: organizationId },
        {
          $setOnInsert: {
            id: programId,
            organization_id: organizationId,
            name: 'PR16 Participation Fixture Program',
            description: 'Development-only compatibility fixture',
            status: 'active',
            is_deleted: false,
            created_at: now,
            updated_at: now,
          },
        },
        { upsert: true },
      );

      membership = await createMembershipCommand({
        db,
        user: auth.user,
        organizationId,
        body: { student_id: studentId, program_id: programId, status: 'active', notes: 'Development fixture for PR16 verification' },
      });
    } else if (membership.status !== 'active') {
      membership = await transitionMembershipCommand({
        db,
        user: auth.user,
        membership,
        body: { status: 'active', reason: 'Development fixture for PR16 verification' },
      });
    }

    const programId = membership.program_id;
    let program = await canonicalPrograms.findOne({ id: programId, organization_id: organizationId });
    if (!program) {
      const now = new Date().toISOString();
      program = createAcademicProgram({
        id: programId,
        organizationId,
        actorId: auth.user.id,
        now,
        input: {
          name: 'PR16 Participation Fixture Program',
          description: 'Development-only canonical Program fixture',
          age_group: 'All ages',
          status: 'active',
        },
      });
      await createCanonicalRecord(db, auth.user, 'academic_programs', program, 'program.created');
    }

    const offeringId = `${FIXTURE_PREFIX}-offering-${organizationId}`;
    let offering = await offerings.findOne({ id: offeringId, organization_id: organizationId });
    if (!offering) {
      const now = new Date().toISOString();
      offering = createProgramOffering({
        id: offeringId,
        organizationId,
        actorId: auth.user.id,
        now,
        input: {
          program_id: program.id,
          academic_year: '2026',
          cohort: 'PR16 Verification Cohort',
          start_date: '2026-07-29',
          end_date: '2026-12-31',
          capacity: 30,
          schedule: { weekdays: [0], start_time: '09:00', end_time: '11:00' },
          status: 'active',
        },
      });
      await createCanonicalRecord(db, auth.user, 'program_offerings', offering, 'program_offering.created');
    }

    const termId = `${FIXTURE_PREFIX}-term-${organizationId}`;
    let term = await terms.findOne({ id: termId, organization_id: organizationId });
    if (!term) {
      term = await createAcademicTerm(db, auth.user, organizationId, {
        id: termId,
        name: 'PR16 Verification Term',
        display_order: 1,
        start_date: '2026-07-29',
        end_date: '2026-12-31',
        status: 'active',
        program_offering_id: offering.id,
      });
    }

    return json({
      fixture: 'membership-term-participation',
      organization_id: organizationId,
      student_id: membership.student_id,
      membership_id: membership.id,
      program_id: program.id,
      program_offering_id: offering.id,
      term_id: term.id,
      status: membership.status,
    }, 201);
  } catch (error) {
    return apiErrorResponse(error, 'PR16 development fixture');
  }
}
