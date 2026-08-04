import { NextResponse } from 'next/server';
import { getDb, requireUser, resolveOrganizationId } from '../../_lib/server.js';
import { classifyAssistantQuestion, formatCurrencyMinor, statusLabel } from '../../_lib/assistant.js';

export const runtime = 'nodejs';

function response(data, status = 200) {
  return NextResponse.json(data, { status });
}

function dateFilter(question) {
  const text = String(question || '').toLowerCase();
  const explicitDate = text.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] || null;
  const date = text.includes('today') ? new Date().toISOString().slice(0, 10) : explicitDate;
  if (!date) return null;
  return { $or: [{ date }, { session_date: date }, { attendance_date: date }] };
}

async function findTerm(db, organizationId, question) {
  const text = String(question || '').toLowerCase();
  const terms = await db.collection('academic_terms').find({ organization_id: organizationId }).toArray();
  return terms
    .filter(term => term.name && text.includes(String(term.name).toLowerCase()))
    .sort((a, b) => String(b.name).length - String(a.name).length)[0] || null;
}

async function findAttendance(db, organizationId, question, termId = null) {
  const filter = { organization_id: organizationId };
  const date = dateFilter(question);
  if (date) Object.assign(filter, date);
  if (termId) filter.term_id = termId;
  return db.collection('attendance_records').find(filter).sort({ date: -1, created_at: -1 }).limit(5000).toArray();
}

function answerForSummary(records) {
  const counts = records.reduce((out, item) => {
    const key = String(item.status || '').toLowerCase();
    out[key] = (out[key] || 0) + 1;
    return out;
  }, {});
  const total = records.length;
  return {
    answer: total ? `There are ${counts.present || 0} Present, ${counts.late || 0} Late, ${counts.absent || 0} Absent, and ${counts.excused || 0} Excused attendance records (${total} total).` : 'There are no attendance records for the selected organization and time range.',
    data: { total, counts },
  };
}

function answerForStatus(records, students, status) {
  const matching = records.filter(item => String(item.status || '').toLowerCase() === status);
  const byId = new Map(students.map(student => [student.id, student]));
  const studentRows = [...new Set(matching.map(item => item.student_id).filter(Boolean))].map(studentId => {
    const student = byId.get(studentId);
    return {
      student_id: studentId,
      name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : 'Unknown student',
    };
  });
  return {
    answer: `${studentRows.length} student${studentRows.length === 1 ? '' : 's'} marked ${statusLabel(status)}.`,
    data: { status, count: studentRows.length, students: studentRows },
  };
}

function answerForAbsentContacts(records, students, canViewPhones) {
  const absentIds = [...new Set(records.filter(item => String(item.status || '').toLowerCase() === 'absent').map(item => item.student_id).filter(Boolean))];
  const byId = new Map(students.map(student => [student.id, student]));
  const contacts = absentIds.map(studentId => {
    const student = byId.get(studentId);
    return { student_id: studentId, name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : 'Unknown student', phone: canViewPhones ? (student?.mobile || student?.phone || student?.contact_phone || null) : null };
  });
  return { answer: canViewPhones ? (contacts.length ? `I found ${contacts.length} absent student${contacts.length === 1 ? '' : 's'} and included their available contact numbers.` : 'No absent students were found.') : (contacts.length ? `I found ${contacts.length} absent student${contacts.length === 1 ? '' : 's'}. Contact numbers are restricted to organization administrators.` : 'No absent students were found.'), data: { count: contacts.length, contacts } };
}

async function optionalAiSummary(question, deterministic, canViewPhones) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL || deterministic.data?.contacts || !canViewPhones) return null;
  try {
    const result = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: 'You are the Gokulam360 administrator assistant. Answer only from the supplied verified data. If it is empty, say so. Do not invent names, counts, dates, or phone numbers. Keep the answer concise and practical.' }] },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ question, verified_result: deterministic }) }] },
        ],
        max_output_tokens: 300,
      }),
    });
    if (!result.ok) return null;
    const body = await result.json();
    return body.output_text || body.output?.flatMap(item => item.content || []).map(item => item.text).filter(Boolean).join(' ') || null;
  } catch (error) {
    console.error('assistant optional AI summary failed', error);
    return null;
  }
}

export async function POST(req) {
  try {
    const auth = requireUser(req, ['super_admin', 'org_admin', 'teacher']);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = await req.json().catch(() => ({}));
    const organizationId = resolveOrganizationId(user, body.organization_id);
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 500) return response({ error: 'Ask a question up to 500 characters.' }, 422);

    const db = await getDb();
    const intent = classifyAssistantQuestion(question);
    const term = await findTerm(db, organizationId, question);
    const records = await findAttendance(db, organizationId, question, term?.id);
    let result;
    if (intent.intent === 'attendance_status') {
      const ids = [...new Set(records.filter(item => String(item.status || '').toLowerCase() === intent.status).map(item => item.student_id).filter(Boolean))];
      const students = ids.length
        ? await db.collection('students').find({ organization_id: organizationId, id: { $in: ids }, is_deleted: { $ne: true } }).toArray()
        : [];
      result = answerForStatus(records, students, intent.status);
    }
    else if (intent.intent === 'absent_contacts') {
      const ids = [...new Set(records.filter(item => String(item.status || '').toLowerCase() === 'absent').map(item => item.student_id).filter(Boolean))];
      const students = ids.length ? await db.collection('students').find({ organization_id: organizationId, id: { $in: ids }, is_deleted: { $ne: true } }).toArray() : [];
      result = answerForAbsentContacts(records, students, ['super_admin', 'org_admin'].includes(user.role));
    } else if (intent.intent === 'payments_due') {
      const payments = await db.collection('payment_transactions').find({ organization_id: organizationId, status: { $in: ['draft', 'pending'] } }).limit(5000).toArray();
      const totalMinor = payments.reduce((sum, payment) => sum + (Number(payment.amount_minor) || 0), 0);
      result = { answer: payments.length ? `${payments.length} payment${payments.length === 1 ? '' : 's'} need attention, totalling ${formatCurrencyMinor(totalMinor)}.` : 'There are no pending payments.', data: { count: payments.length, total_minor: totalMinor, currency: 'INR' } };
    } else if (intent.intent === 'upcoming_sessions') {
      const today = new Date().toISOString().slice(0, 10);
      const sessions = await db.collection('academic_sessions').find({ organization_id: organizationId, date: { $gte: today }, status: { $nin: ['cancelled', 'holiday'] } }).sort({ date: 1, start_time: 1 }).limit(10).toArray();
      result = { answer: sessions.length ? `The next session is ${sessions[0].date} and ${sessions.length - 1} more session${sessions.length - 1 === 1 ? '' : 's'} are scheduled.` : 'There are no upcoming sessions.', data: { sessions: sessions.map(session => ({ id: session.id, date: session.date, start_time: session.start_time, end_time: session.end_time, term_id: session.term_id })) } };
    } else result = answerForSummary(records);

    const aiAnswer = await optionalAiSummary(question, result, ['super_admin', 'org_admin'].includes(user.role));
    return response({ ...result, answer: aiAnswer || result.answer, intent: intent.intent, generated_by: aiAnswer ? 'openai_verified_context' : 'deterministic_verified_context', sources: ['attendance_records', intent.intent === 'payments_due' ? 'payment_transactions' : null].filter(Boolean) });
  } catch (error) {
    console.error('assistant request failed', error);
    return response({ error: 'The assistant could not complete that request.' }, Number.isInteger(error?.status) ? error.status : 500);
  }
}
