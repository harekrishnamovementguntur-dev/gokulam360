import { v4 as uuidv4 } from 'uuid';
import { getDb, json, apiErrorResponse, requireUser, resolveOrganizationId, runInTransaction, stripId } from '../_lib/server.js';
import { ensureMembershipInfrastructure } from '../_lib/memberships.js';
import { ensureParticipationInfrastructure } from '../_lib/membership-term-participation.js';
import { ensurePaymentInfrastructure } from '../_lib/payments.js';
import { ensureCreditLedgerInfrastructure } from '../_lib/credit-ledger.js';
import { createMembership } from '../../../lib/membership-domain.mjs';
import { createParticipation } from '../../../lib/membership-term-participation-domain.mjs';
import { createPayment } from '../../../lib/payment-domain.mjs';
import { createLedgerEntry } from '../../../lib/credit-ledger-domain.mjs';
import { calculateAdmissionCredits } from '../../../lib/admission-credit-policy.mjs';

export const runtime = 'nodejs';

let infrastructurePromise;

async function ensureAdmissionInfrastructure(db) {
  if (!infrastructurePromise) {
    infrastructurePromise = db.collection('admission_commands').createIndex(
      { organization_id: 1, idempotency_key: 1 },
      { unique: true, name: 'admission_commands_idempotency_unique' },
    ).catch((error) => {
      infrastructurePromise = undefined;
      throw error;
    });
  }
  return infrastructurePromise;
}

const audit = ({ organizationId, entityType, entityId, actor, action, now, details = {} }) => ({
  id: uuidv4(),
  organization_id: organizationId,
  entity_type: entityType,
  entity_id: entityId,
  action,
  actor_id: actor.id,
  actor_name: actor.name || '',
  details,
  created_at: now,
});

const outbox = ({ organizationId, aggregateType, aggregateId, eventType, payload, now }) => ({
  id: uuidv4(),
  organization_id: organizationId,
  aggregate_type: aggregateType,
  aggregate_id: aggregateId,
  event_type: eventType,
  payload,
  status: 'pending',
  occurred_at: now,
  created_at: now,
});

const requiredText = (body, key) => {
  const value = String(body?.[key] || '').trim();
  if (!value) throw Object.assign(new Error(`${key} is required`), { status: 422 });
  return value;
};

async function canonicalReferences(db, organizationId, body) {
  const programId = requiredText(body, 'program_id');
  const offeringId = requiredText(body, 'offering_id');
  const termId = requiredText(body, 'term_id');

  const [program, offering, term] = await Promise.all([
    db.collection('academic_programs').findOne({ id: programId, organization_id: organizationId, status: { $ne: 'archived' } }),
    db.collection('program_offerings').findOne({ id: offeringId, organization_id: organizationId, status: { $ne: 'archived' } }),
    db.collection('academic_terms').findOne({ id: termId, organization_id: organizationId, status: { $ne: 'archived' } }),
  ]);
  if (!program) throw Object.assign(new Error('Academic Program not found in this organization'), { status: 404 });
  if (!offering) throw Object.assign(new Error('Program Offering not found in this organization'), { status: 404 });
  if (offering.program_id !== program.id) throw Object.assign(new Error('Program Offering does not belong to the selected Academic Program'), { status: 422 });
  if (!term) throw Object.assign(new Error('Academic Term not found in this organization'), { status: 404 });
  if (term.program_offering_id !== offering.id) throw Object.assign(new Error('Academic Term does not belong to the selected Program Offering'), { status: 422 });

  return { program, offering, term };
}

function studentDocument(body, organizationId, actorId, now) {
  const id = uuidv4();
  return {
    id,
    student_id: String(body.student_id || `G360-${id.slice(0, 8).toUpperCase()}`),
    organization_id: organizationId,
    first_name: requiredText(body, 'first_name'),
    last_name: requiredText(body, 'last_name'),
    dob: typeof body.dob === 'string' ? body.dob : '',
    gender: typeof body.gender === 'string' ? body.gender : '',
    mobile: typeof body.mobile === 'string' ? body.mobile : '',
    email: typeof body.email === 'string' ? body.email : '',
    father_name: typeof body.father_name === 'string' ? body.father_name : '',
    mother_name: typeof body.mother_name === 'string' ? body.mother_name : '',
    address: typeof body.address === 'string' ? body.address : '',
    status: 'active',
    is_deleted: false,
    program_id: String(body.program_id),
    public_token: uuidv4(),
    created_by: actorId,
    created_at: now,
    updated_at: now,
  };
}

function resultFor({ student, membership, participation, payment, creditSummary }) {
  return {
    student: stripId(student),
    membership: stripId(membership),
    participation: stripId(participation),
    payment: payment ? stripId(payment) : null,
    credit_summary: creditSummary,
  };
}

export async function POST(req) {
  const auth = requireUser(req, ['super_admin', 'org_admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const idempotencyKey = String(req.headers.get('idempotency-key') || '').trim();
    if (!idempotencyKey) return json({ error: 'Idempotency-Key header is required' }, 400);

    const db = await getDb();
    await ensureAdmissionInfrastructure(db);
    await Promise.all([
      ensureMembershipInfrastructure(db),
      ensureParticipationInfrastructure(db),
      ensurePaymentInfrastructure(db),
      ensureCreditLedgerInfrastructure(db),
    ]);

    const organizationId = resolveOrganizationId(auth.user, body.organization_id);
    const existing = await db.collection('admission_commands').findOne({ organization_id: organizationId, idempotency_key: idempotencyKey });
    if (existing?.result) return json(existing.result);

    const references = await canonicalReferences(db, organizationId, body);
    const sessions = await db.collection('academic_sessions').find({
      organization_id: organizationId,
      term_id: references.term.id,
    }).sort({ date: 1, session_number: 1 }).toArray();
    const creditSummary = calculateAdmissionCredits({
      sessions,
      policy: body.credit_policy || 'remaining',
      customCredits: body.custom_credits,
      asOf: body.admission_date || new Date().toISOString().slice(0, 10),
    });

    const paymentNow = Boolean(body.payment_now);
    const amountMinor = Number(body.amount_minor || 0);
    if (paymentNow && (!Number.isInteger(amountMinor) || amountMinor <= 0)) {
      return json({ error: 'amount_minor must be a positive integer when payment_now is enabled' }, 422);
    }
    if (paymentNow && creditSummary.credits <= 0) {
      return json({ error: 'At least one credit is required when payment_now is enabled' }, 422);
    }

    const now = new Date().toISOString();
    const student = studentDocument(body, organizationId, auth.user.id, now);
    const membership = createMembership({
      id: uuidv4(),
      organizationId,
      studentId: student.id,
      programId: references.program.id,
      status: 'active',
      actorId: auth.user.id,
      now,
      metadata: {
        admission_credit_policy: body.credit_policy || 'remaining',
        term_id: references.term.id,
        program_offering_id: references.offering.id,
      },
    });
    const participation = createParticipation({
      id: uuidv4(),
      organizationId,
      membershipId: membership.id,
      programOfferingId: references.offering.id,
      termId: references.term.id,
      actorId: auth.user.id,
      now,
    });

    let payment = null;
    let allocation = null;
    let ledgerEntry = null;
    if (paymentNow) {
      payment = createPayment({
        id: uuidv4(),
        organizationId,
        amountMinor,
        currency: body.currency || 'INR',
        method: body.payment_method || 'cash',
        description: typeof body.payment_description === 'string' ? body.payment_description : 'Admission payment',
        receiptNumber: 'G360-' + new Date().getUTCFullYear() + '-' + uuidv4().replaceAll('-', '').slice(0, 10).toUpperCase(),
        actorId: auth.user.id,
        now,
        idempotencyKey,
      });
      payment.status = 'posted';
      payment.posted_at = now;
      payment.post_idempotency_key = idempotencyKey;
      allocation = {
        id: uuidv4(),
        organization_id: organizationId,
        payment_transaction_id: payment.id,
        membership_id: membership.id,
        amount_minor: amountMinor,
        credit_quantity: creditSummary.credits,
        allocation_type: 'payment',
        status: 'posted',
        description: 'Credits granted during admission',
        created_by: auth.user.id,
        created_at: now,
      };
      ledgerEntry = createLedgerEntry({
        id: uuidv4(),
        organizationId,
        membershipId: membership.id,
        quantityDelta: creditSummary.credits,
        reasonCode: 'credit_purchase',
        description: 'Credits granted from admission payment',
        sourceType: 'payment_allocation',
        sourceId: allocation.id,
        actorId: auth.user.id,
        now,
        commandId: allocation.id,
      });
    }

    const result = resultFor({
      student,
      membership,
      participation,
      payment,
      creditSummary: { ...creditSummary, payment_amount_minor: paymentNow ? amountMinor : 0 },
    });
    await runInTransaction(db, async (session) => {
      await db.collection('students').insertOne(student, { session });
      await db.collection('memberships').insertOne(membership, { session });
      await db.collection('membership_term_participations').insertOne(participation, { session });
      if (payment) {
        await db.collection('payment_transactions').insertOne(payment, { session });
        await db.collection('payment_allocations').insertOne(allocation, { session });
        await db.collection('credit_ledger_entries').insertOne(ledgerEntry, { session });
      }
      await db.collection('audit_logs').insertMany([
        audit({ organizationId, entityType: 'student', entityId: student.id, actor: auth.user, action: 'student.admitted', now, details: { membership_id: membership.id, participation_id: participation.id, credit_policy: body.credit_policy || 'remaining' } }),
        audit({ organizationId, entityType: 'membership', entityId: membership.id, actor: auth.user, action: 'membership.created', now, details: { student_id: student.id, program_id: references.program.id } }),
        audit({ organizationId, entityType: 'membership_term_participation', entityId: participation.id, actor: auth.user, action: 'participation.created', now, details: { term_id: references.term.id, program_offering_id: references.offering.id } }),
        ...(payment ? [audit({ organizationId, entityType: 'payment_transaction', entityId: payment.id, actor: auth.user, action: 'payment.posted', now, details: { amount_minor: amountMinor, credit_quantity: creditSummary.credits } })] : []),
      ], { session });
      await db.collection('outbox_events').insertMany([
        outbox({ organizationId, aggregateType: 'student', aggregateId: student.id, eventType: 'student.admitted', now, payload: { student_id: student.id, membership_id: membership.id, participation_id: participation.id } }),
        outbox({ organizationId, aggregateType: 'membership', aggregateId: membership.id, eventType: 'membership.created', now, payload: { membership_id: membership.id, student_id: student.id, program_id: references.program.id } }),
        outbox({ organizationId, aggregateType: 'membership_term_participation', aggregateId: participation.id, eventType: 'participation.created', now, payload: { participation_id: participation.id, membership_id: membership.id, term_id: references.term.id } }),
        ...(payment ? [outbox({ organizationId, aggregateType: 'payment_transaction', aggregateId: payment.id, eventType: 'payment.posted', now, payload: { payment_id: payment.id, receipt_number: payment.receipt_number, credit_quantity: creditSummary.credits } })] : []),
      ], { session });
      await db.collection('admission_commands').insertOne({
        id: uuidv4(),
        organization_id: organizationId,
        idempotency_key: idempotencyKey,
        result,
        created_at: now,
        updated_at: now,
      }, { session });
    });
    return json(result, 201);
  } catch (error) {
    return apiErrorResponse(error, 'Admission');
  }
}
