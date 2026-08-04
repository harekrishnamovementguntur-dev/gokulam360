import { NextResponse } from 'next/server';
import { getDb } from '../../../_lib/server.js';

export const runtime = 'nodejs';

const clean = (doc) => {
  if (!doc) return doc;
  const { _id, password_hash, ...rest } = doc;
  return rest;
};

export async function GET(_request, { params }) {
  try {
    const { token } = await params;
    const db = await getDb();
    const student = await db.collection('students').findOne({ public_token: token, is_deleted: { $ne: true } });
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const organization = await db.collection('organizations').findOne({ id: student.organization_id, is_deleted: { $ne: true } });
    if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const memberships = await db.collection('memberships').find({
      organization_id: student.organization_id,
      student_id: student.id,
      status: { $nin: ['archived', 'inactive'] },
    }).toArray();
    const membershipIds = memberships.map(item => item.id);
    const participations = membershipIds.length ? await db.collection('membership_term_participations').find({
      organization_id: student.organization_id,
      membership_id: { $in: membershipIds },
      status: { $nin: ['archived', 'withdrawn'] },
    }).toArray() : [];
    const offeringIds = [...new Set(participations.map(item => item.program_offering_id).filter(Boolean))];
    const termIds = [...new Set(participations.map(item => item.term_id).filter(Boolean))];
    const offerings = offeringIds.length ? await db.collection('program_offerings').find({ organization_id: student.organization_id, id: { $in: offeringIds } }).toArray() : [];
    const programs = [...new Set(offerings.map(item => item.program_id).filter(Boolean))].length
      ? await db.collection('academic_programs').find({ organization_id: student.organization_id, id: { $in: [...new Set(offerings.map(item => item.program_id).filter(Boolean))] } }).toArray()
      : [];
    const terms = termIds.length ? await db.collection('academic_terms').find({ organization_id: student.organization_id, id: { $in: termIds } }).toArray() : [];
    const sessions = termIds.length ? await db.collection('academic_sessions').find({ organization_id: student.organization_id, term_id: { $in: termIds } }).sort({ date: -1 }).limit(100).toArray() : [];
    const participationIds = participations.map(item => item.id);
    const attendance = participationIds.length ? await db.collection('attendance_records').find({
      organization_id: student.organization_id,
      membership_term_participation_id: { $in: participationIds },
    }).sort({ date: -1, created_at: -1 }).limit(50).toArray() : [];
    const payments = await db.collection('payment_transactions').find({
      organization_id: student.organization_id,
      $or: [{ student_id: student.id }, ...(membershipIds.length ? [{ membership_id: { $in: membershipIds } }] : [])],
    }).sort({ created_at: -1 }).limit(100).toArray();

    const classIds = [...new Set([
      ...offerings.map(item => item.program_id),
      ...offerings.map(item => item.id),
    ].filter(Boolean))];
    const announcements = await db.collection('events').find({
      organization_id: student.organization_id,
      is_announcement: true,
      is_deleted: { $ne: true },
      $or: [{ program_id: { $in: classIds } }, { program_offering_id: { $in: classIds } }, { visibility: 'public' }, { program_id: { $exists: false }, program_offering_id: { $exists: false } }],
    }).sort({ priority: -1, date: -1 }).limit(3).toArray();

    const programById = new Map(programs.map(item => [item.id, item]));
    const offeringById = new Map(offerings.map(item => [item.id, item]));
    const termById = new Map(terms.map(item => [item.id, item]));
    const attendanceByParticipation = attendance.reduce((map, item) => {
      const key = item.membership_term_participation_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());

    const classes = participations.map(participation => {
      const offering = offeringById.get(participation.program_offering_id);
      const program = offering ? programById.get(offering.program_id) : null;
      const term = termById.get(participation.term_id);
      const records = attendanceByParticipation.get(participation.id) || [];
      const attended = records.filter(item => ['present', 'late'].includes(String(item.status).toLowerCase())).length;
      return {
        id: participation.id,
        status: participation.status,
        program_name: program?.name || 'Class',
        sessions_credited: sessions.filter(session => session.term_id === participation.term_id).length,
        offering_name: offering?.name || offering?.batch_name || '',
        term_name: term?.name || '',
        sessions_attended: attended,
        sessions_recorded: records.length,
      };
    });

    return NextResponse.json({
      student: { id: student.id, student_id: student.student_id, first_name: student.first_name, last_name: student.last_name, photo_url: student.photo_url, dob: student.dob },
      organization: { name: organization.name, logo_url: organization.logo_url, contact_email: organization.contact_email, contact_phone: organization.contact_phone },
      classes,
      attendance: attendance.map(clean),
      payments: payments.map(payment => ({ ...clean(payment), amount: Number(payment.amount_minor || 0) / 100, paid_amount: payment.status === 'posted' ? Number(payment.amount_minor || 0) / 100 : 0, status: payment.status === 'posted' ? 'paid' : payment.status })),
      announcements: announcements.map(clean),
      canonical: { memberships: memberships.map(clean), participations: participations.map(clean), offerings: offerings.map(clean), terms: terms.map(clean), sessions: sessions.map(clean) },
    });
  } catch (error) {
    console.error('public canonical student portal failed', error);
    return NextResponse.json({ error: 'Unable to load the parent view' }, { status: 500 });
  }
}
