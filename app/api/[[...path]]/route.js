import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import twilio from 'twilio';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'gokulam360';
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication must never silently fall back to a publicly known secret.
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM_NUMBER;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM;
const twilioClient = (TWILIO_SID && TWILIO_TOKEN && TWILIO_SID.startsWith('AC')) ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim().replace(/[\s\-()]/g, '');
  if (!p.startsWith('+')) {
    // Assume India if 10 digits
    if (/^\d{10}$/.test(p)) p = '+91' + p;
    else if (/^91\d{10}$/.test(p)) p = '+' + p;
    else return null;
  }
  return p;
}

async function sendTwilioMessage(channel, to, message) {
  if (!twilioClient) return { status: 'mock', error: 'Twilio not configured' };
  const phone = normalizePhone(to);
  if (!phone) return { status: 'failed', error: 'Invalid phone: ' + to };
  try {
    const payload = channel === 'whatsapp'
      ? { from: `whatsapp:${TWILIO_WA_FROM}`, to: `whatsapp:${phone}`, body: message }
      : { from: TWILIO_SMS_FROM, to: phone, body: message };
    const msg = await twilioClient.messages.create(payload);
    return { status: msg.status, sid: msg.sid };
  } catch (e) {
    return { status: 'failed', error: e.message };
  }
}

let cachedClient = null;
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL);
    await cachedClient.connect();
  }
  return cachedClient.db(DB_NAME);
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function attendanceConsumesCredit(status) {
  return ['present', 'absent', 'late'].includes(status);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}


function normalizeAccountEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function hashAccountOtp(code) {
  return crypto.createHash('sha256').update(`${JWT_SECRET}:${code}`).digest('hex');
}
function maskAccountEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return 'invalid-email';
  return `${local.slice(0, 2)}***@${domain}`;
}

async function sendAccountOtp(email, code, purpose) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM
    || process.env.RESEND_FROM_EMAIL
    || 'Gokulam360 <onboarding@resend.dev>';
  const payload = {
    from,
    to: [email],
    subject: purpose === 'forgot_password'
      ? 'Reset your Gokulam360 password'
      : 'Verify your Gokulam360 password change',
    text: `Your Gokulam360 verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  };

  console.info('[account-otp] resend_request', {
    purpose,
    from,
    to: [maskAccountEmail(email)],
    subject: payload.subject,
  });

  if (!apiKey) {
    console.error('[account-otp] resend_unavailable', {
      purpose,
      reason: 'RESEND_API_KEY is missing',
    });
    return { ok: false, error: 'Email delivery is not configured. Please contact an administrator.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }

    console.info('[account-otp] resend_response', {
      purpose,
      status: response.status,
      ok: response.ok,
      response: responseBody,
    });

    if (!response.ok) {
      const providerMessage = responseBody?.message || responseBody?.error?.message;
      return {
        ok: false,
        error: providerMessage || 'Unable to send the verification email. Please try again later.',
      };
    }

    const emailId = responseBody?.id || responseBody?.data?.id;
    if (!emailId) {
      console.error('[account-otp] resend_invalid_response', {
        purpose,
        response: responseBody,
      });
      return { ok: false, error: 'Email provider returned an invalid response. Please try again later.' };
    }

    console.info('[account-otp] resend_accepted', { purpose, emailId });
    return { ok: true, emailId };
  } catch (error) {
    console.error('[account-otp] resend_request_failed', {
      purpose,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { ok: false, error: 'Unable to reach the email provider. Please try again later.' };
  }
}

async function issueAccountOtp(db, { email, userId, purpose, organizationId }) {
  console.info('[account-otp] request_received', {
    purpose,
    email: maskAccountEmail(email),
    userId,
  });
  const now = Date.now();
  const recent = await db.collection('account_otps').countDocuments({ email, purpose, created_at: { $gt: new Date(now - 60 * 1000) } });
  if (recent) return { error: 'Please wait before requesting another code' };
  const hourly = await db.collection('account_otps').countDocuments({ email, purpose, created_at: { $gt: new Date(now - 60 * 60 * 1000) } });
  if (hourly >= 5) return { error: 'Too many verification attempts. Try again later' };
  const code = String(crypto.randomInt(100000, 1000000));
  console.info('[account-otp] otp_generated', {
    purpose,
    email: maskAccountEmail(email),
    expiresInMinutes: 10,
  });
  const delivery = await sendAccountOtp(email, code, purpose);
  if (!delivery.ok) {
    console.error('[account-otp] final_status', {
      purpose,
      email: maskAccountEmail(email),
      status: 'failed',
      error: delivery.error,
    });
    return { error: delivery.error };
  }
  await db.collection('account_otps').insertOne({ id: uuidv4(), email, user_id: userId, organization_id: organizationId || null, purpose, otp_hash: hashAccountOtp(code), expires_at: new Date(now + 10 * 60 * 1000), attempts: 0, used: false, created_at: new Date(now) });
  console.info('[account-otp] final_status', {
    purpose,
    email: maskAccountEmail(email),
    status: 'sent',
    emailId: delivery.emailId,
  });
  return { ok: true, emailId: delivery.emailId };
}

async function consumeAccountOtp(db, { email, purpose, code }) {
  const otp = await db.collection('account_otps').findOne({ email, purpose, used: false }, { sort: { created_at: -1 } });
  if (!otp || otp.expires_at < new Date() || Number(otp.attempts || 0) >= 5) return false;
  await db.collection('account_otps').updateOne({ id: otp.id }, { $inc: { attempts: 1 } });
  if (hashAccountOtp(code) !== otp.otp_hash) return false;
  await db.collection('account_otps').updateOne({ id: otp.id }, { $set: { used: true, used_at: new Date() } });
  return true;
}
async function recordAccountAudit(db, user, action, metadata = {}) {
  await db.collection('audit_logs').insertOne({ id: uuidv4(), organization_id: user.organization_id || null, actor_id: user.id, actor_email: user.email, action, metadata, created_at: new Date().toISOString() });
}

async function requireAuth(req, roles = null) {
  const user = verifyToken(req);
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) };
  if (roles && !roles.includes(user.role)) {
    return { error: json({ error: 'Forbidden' }, 403) };
  }
  return { user };
}


function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}
function studentDisplayName(student) {
  return `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Unknown student';
}
function answerRows(intent, title, columns, rows, summary, answer) {
  return json({ intent, title, answer, summary, columns, rows, exportable: rows.length > 0 });
}
async function answerAskAI(db, user, question) {
  const q = String(question || '').trim().toLowerCase();
  if (!q) return json({ error: 'Ask a question about your organization data' }, 422);
  const scope = orgScope(user);
  const [students, programs, attendanceLegacy, attendanceCanonical, fees, payments, enrollments, participations] = await Promise.all([
    db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray(),
    db.collection('programs').find({ ...scope, is_deleted: { $ne: true } }).toArray(),
    db.collection('attendance').find(scope).toArray(),
    db.collection('attendance_records').find(scope).toArray(),
    db.collection('fees').find(scope).toArray(),
    db.collection('payments').find(scope).toArray(),
    db.collection('enrollments').find(scope).toArray(),
    db.collection('membership_term_participations').find(scope).toArray(),
  ]);
  const attendance = [...attendanceLegacy, ...attendanceCanonical];
  const feeRecords = [...fees, ...payments];
  const enrollmentRecords = [...enrollments, ...participations];
  const studentMap = new Map(students.map(s => [s.id, s]));
  const programMap = new Map(programs.map(p => [p.id, p]));
  const requestedDate = q.match(/\\b\\d{4}-\\d{2}-\\d{2}\\b/)?.[0] || (q.includes('today') ? localToday() : null);
  const program = programs.map(p => ({ p, overlap: String(p.name || '').toLowerCase().split(/\\s+/).filter(w => w.length > 2 && q.includes(w)).length })).sort((a, b) => b.overlap - a.overlap)[0]?.p;
  const withStudent = row => studentMap.get(row.student_id || row.membership_student_id || row.studentId);
  const isAbsent = a => String(a.status || '').toLowerCase() === 'absent';
  const isPresent = a => ['present', 'late'].includes(String(a.status || '').toLowerCase());
  const rowsFor = predicate => attendance.filter(a => (!requestedDate || String(a.date || a.session_date || '').slice(0, 10) === requestedDate) && predicate(a)).map(a => {
    const s = withStudent(a); return { student: studentDisplayName(s), phone: s?.mobile || s?.phone || '—', date: a.date || a.session_date || '—', status: a.status };
  });
  if (q.includes('upcoming') || q.includes('next session')) {
    const today = localToday();
    const rows = programs.flatMap(p => (Array.isArray(p.sessions) ? p.sessions : []).filter(s => String(s.date || '').slice(0,10) >= today).map(s => ({ date: s.date, program: p.name || '—', batch: s.batch_name || s.batch || '—', status: s.status || 'scheduled' }))).sort((a,b) => String(a.date).localeCompare(String(b.date)));
    return answerRows('upcoming_sessions', 'Upcoming sessions', ['date','program','batch','status'], rows, { sessions: rows.length }, rows.length ? `${rows.length} upcoming session(s)` : 'No upcoming sessions found');
  }
  if (q.includes('credit') && (q.includes('less') || q.includes('below') || q.includes('low') || q.includes('3'))) {
    const rows = enrollmentRecords.map(e => {
      const s = studentMap.get(e.student_id); const granted = Number(e.credits_granted ?? e.total_credits ?? e.credit_quantity ?? 0); const used = Number(e.credits_used ?? 0);
      return { student: studentDisplayName(s), phone: s?.mobile || s?.phone || '—', program: programMap.get(e.program_id)?.name || e.program_name || '—', granted, used, remaining: Number(e.credits_remaining ?? granted - used) };
    }).filter(r => r.remaining <= 3 && r.remaining >= 0);
    return answerRows('low_credits', 'Students with 3 or fewer credits', ['student','phone','program','granted','used','remaining'], rows, { students: rows.length }, rows.length ? `${rows.length} student(s) need attention` : 'No students have 3 or fewer credits');
  }
  if (q.includes('absent') || q.includes('absence')) {
    const rows = rowsFor(isAbsent);
    return answerRows('absentees', 'Absent students', ['student','phone','date','status'], rows, { absent: rows.length }, rows.length ? `${rows.length} absent record(s)` : 'No absences found');
  }
  if (q.includes('present') || q.includes('attend')) {
    const rows = rowsFor(isPresent);
    return answerRows('attendance', 'Present students', ['student','phone','date','status'], rows, { present: rows.length }, rows.length ? `${rows.length} present record(s)` : 'No present records found');
  }
  if (q.includes('payment') || q.includes('fee') || q.includes('paid')) {
    const rows = feeRecords.map(f => {
      const s = studentMap.get(f.student_id); return { student: studentDisplayName(s), phone: s?.mobile || s?.phone || '—', amount: Number(f.amount_minor ?? f.amount ?? 0) / 100, paid: Number(f.paid_minor ?? f.amount_paid_minor ?? f.paid ?? 0) / 100, status: f.status || '—' };
    });
    return answerRows('payments', 'Payments and fees', ['student','phone','amount','paid','status'], rows, { records: rows.length }, `${rows.length} payment record(s)`);
  }
  if (q.includes('student') || q.includes('member')) {
    const rows = students.map(s => ({ student: studentDisplayName(s), student_id: s.student_id || s.id, phone: s.mobile || s.phone || '—', email: s.email || '—', status: s.status || '—' }));
    return answerRows('students', 'Students', ['student','student_id','phone','email','status'], rows, { students: rows.length }, `${rows.length} student(s)`);
  }
  return json({ error: 'I can answer about attendance, absentees, upcoming sessions, low credits, students, and payments.' }, 422);
}

// Scope filter: super_admin sees all; others limited to their org
function orgScope(user, extra = {}) {
  if (user.role === 'super_admin') return { ...extra };
  return { organization_id: user.organization_id, ...extra };
}

function stripId(doc) {
  if (!doc) return doc;
  const { _id, password_hash, ...rest } = doc;
  return rest;
}

function generateSessions(program) {
  const days = program.days_of_week || [];
  if (!days.length || !program.start_date || !program.end_date) return [];
  const cancelled = new Set(program.cancelled_dates || []);
  const postponed = program.postponed_dates || {};
  const sessions = new Set();
  const start = new Date(program.start_date + 'T00:00:00');
  const end = new Date(program.end_date + 'T00:00:00');
  const cur = new Date(start);
  while (cur <= end) {
    if (days.includes(cur.getDay())) {
      const d = cur.toISOString().slice(0, 10);
      if (!cancelled.has(d)) sessions.add(postponed[d] || d);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return [...sessions].sort();
}

async function finalizePastStudentAttendance(db, user, programId, sessions) {
  const today = new Date().toISOString().slice(0, 10);
  const pastDates = sessions.filter(date => date < today);
  if (!pastDates.length) return;

  const enrollmentQuery = { ...orgScope(user), program_id: programId, left_at: null, status: 'active' };
  const enrollments = await db.collection('enrollments').find(enrollmentQuery).toArray();
  const studentIds = [...new Set(enrollments.map(enrollment => enrollment.student_id))];
  if (!studentIds.length) return;

  const students = await db.collection('students').find({
    ...orgScope(user),
    id: { $in: studentIds },
    status: 'active',
    is_deleted: { $ne: true },
  }).toArray();
  const activeStudents = students.filter(student => !student.active_from || student.active_from.slice(0, 10) <= today);
  const activeIds = activeStudents.map(student => student.id);
  if (!activeIds.length) return;

  const existing = await db.collection('attendance').find({
    ...orgScope(user),
    program_id: programId,
    student_id: { $in: activeIds },
    date: { $in: pastDates },
  }).toArray();
  const recorded = new Set(existing.map(record => `${record.student_id}:${record.date}`));
  const now = new Date().toISOString();
  const docs = [];

  for (const date of pastDates) {
    for (const student of activeStudents) {
      const enrollment = enrollments.find(item => item.student_id === student.id);
      if (!enrollment) continue;
      const activeFrom = (student.active_from || enrollment.enrolled_at || '').slice(0, 10);
      if (activeFrom && date < activeFrom) continue;
      const key = `${student.id}:${date}`;
      if (recorded.has(key)) continue;
      docs.push({
        id: uuidv4(),
        organization_id: enrollment.organization_id || user.organization_id,
        program_id: programId,
        date,
        student_id: student.id,
        status: 'absent',
        auto_finalized: true,
        marked_by: 'system',
        created_at: now,
      });
      recorded.add(key);
    }
  }

  if (docs.length) await db.collection('attendance').insertMany(docs);

  const history = await db.collection('attendance').find({
    ...orgScope(user),
    program_id: programId,
    student_id: { $in: activeIds },
  }).toArray();

  for (const enrollment of enrollments) {
    if (!activeIds.includes(enrollment.student_id)) continue;
    const used = history.filter(record =>
      record.student_id === enrollment.student_id &&
      attendanceConsumesCredit(record.status) &&
      (!enrollment.enrolled_at || record.date >= enrollment.enrolled_at.slice(0, 10)),
    ).length;
    const credited = Number(enrollment.sessions_credited || 0);
    await db.collection('enrollments').updateOne(
      { id: enrollment.id, organization_id: enrollment.organization_id || user.organization_id },
      { $set: { sessions_attended: used, sessions_remaining: Math.max(0, credited - used), updated_at: now } },
    );
  }
}

async function syncEnrollments(db, student, oldProgramIds = [], enrollmentDetails = {}, options = {}) {
  const orgId = student.organization_id;
  const newIds = student.program_ids || [];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const reuseExistingCredits = options.reuseExistingCredits === true;
  const added = newIds.filter(id => !oldProgramIds.includes(id));
  const removed = oldProgramIds.filter(id => !newIds.includes(id));

  // When an existing student joins another Credit model batch, move the
  // student's unused credit balance to the new batch instead of creating
  // another independent credit grant.
  let transferable = [];
  if (reuseExistingCredits) {
    const active = await db.collection('enrollments').find({ organization_id: orgId, student_id: student.id, left_at: null, status: 'active' }).toArray();
    const activeProgramIds = [...new Set(active.map(e => e.program_id))];
    const activePrograms = await db.collection('programs').find({ id: { $in: activeProgramIds }, organization_id: orgId }).toArray();
    const programMap = Object.fromEntries(activePrograms.map(p => [p.id, p]));
    const history = await db.collection('attendance').find({ organization_id: orgId, student_id: student.id }).toArray();
    transferable = active
      .filter(e => (programMap[e.program_id]?.billing_model || 'credit') === 'credit')
      .map(e => {
        const enrolledDate = (e.enrolled_at || '').slice(0, 10);
        const used = history.filter(a => a.program_id === e.program_id && attendanceConsumesCredit(a.status) && a.date >= enrolledDate).length;
        const credited = Number(e.sessions_credited || 0);
        return { enrollment: e, used, remaining: Math.max(0, credited - used) };
      })
      .filter(item => item.remaining > 0);
  }

  for (const pid of added) {
    const existing = await db.collection('enrollments').findOne({ organization_id: orgId, student_id: student.id, program_id: pid, left_at: null });
    if (existing) continue;
    const prog = await db.collection('programs').findOne({ id: pid, organization_id: orgId });
    if (!prog) continue;
    const model = prog.billing_model || 'credit';
    const allSessions = prog.sessions || [];
    const detail = enrollmentDetails[pid] || {};
    const hasCreditDetail = detail.credit_quantity !== undefined && detail.credit_quantity !== '';
    const hasFeeDetail = detail.fee_amount !== undefined && detail.fee_amount !== '';
    let credited = 0;
    let transferred = 0;

    if (model === 'credit') {
      if (hasCreditDetail) {
        credited = Math.max(0, Number(detail.credit_quantity) || 0);
      } else if (reuseExistingCredits) {
        const source = transferable.find(item => item.remaining > 0);
        if (source) {
          transferred = source.remaining;
          credited = transferred;
          source.remaining = 0;
          await db.collection('enrollments').updateOne(
            { id: source.enrollment.id, organization_id: orgId },
            { $set: { sessions_credited: source.used + transferred, sessions_attended: source.used, sessions_remaining: 0, updated_at: now } },
          );
        }
      } else {
        const remainingFromToday = allSessions.filter(d => d >= today);
        credited = remainingFromToday.length || allSessions.length;
      }
    }

    const feeAmount = hasFeeDetail
      ? Math.max(0, Number(detail.fee_amount) || 0)
      : (model === 'date' ? Number(prog.fee_amount || 0) : (reuseExistingCredits && transferred ? 0 : Number(prog.fee_amount || 0)));
    const paidAmount = Math.min(feeAmount, Math.max(0, Number(detail.amount_paid) || 0));
    await db.collection('enrollments').insertOne({
      id: uuidv4(), organization_id: orgId, student_id: student.id, program_id: pid,
      enrolled_at: now, left_at: null, status: 'active',
      sessions_credited: credited,
      created_at: now,
    });
    if (feeAmount > 0 || paidAmount > 0) {
      await db.collection('fees').insertOne({
        id: uuidv4(), organization_id: orgId, student_id: student.id, program_id: pid,
        fee_type: model === 'date' ? 'Batch Fee' : 'Term Fee', amount: feeAmount, paid_amount: paidAmount,
        payment_mode: detail.payment_mode || null,
        collection_date: detail.collection_date || null,
        collected_by: detail.collected_by || null,
        notes: detail.notes || '',
        payment_history: paidAmount > 0 ? [{ id: uuidv4(), amount: paidAmount, mode: detail.payment_mode || null, collection_date: detail.collection_date || null, collected_by: detail.collected_by || null, notes: detail.notes || '', recorded_at: now }] : [],
        credit_quantity: credited,
        status: paidAmount >= feeAmount && feeAmount > 0 ? 'paid' : 'pending',
        due_date: prog.start_date || today, created_at: now,
      });
    }
  }

  for (const pid of removed) {
    await db.collection('enrollments').updateMany(
      { organization_id: orgId, student_id: student.id, program_id: pid, left_at: null },
      { $set: { left_at: now, status: 'left' } },
    );
  }
}

// ========== SEED ==========
async function handleSeed() {
  const db = await getDb();
  await db.collection('organizations').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('students').deleteMany({});
  await db.collection('teachers').deleteMany({});
  await db.collection('programs').deleteMany({});
  await db.collection('attendance').deleteMany({});
  await db.collection('fees').deleteMany({});
  await db.collection('payments').deleteMany({});
  await db.collection('events').deleteMany({});

  const orgId = uuidv4();
  const org = {
    id: orgId,
    name: 'ISKCON Gokulam Sunday School',
    address: 'Temple Road, Vrindavan Colony, Kochi 682001',
    contact_email: 'contact@iskcongokulam.org',
    contact_phone: '+91 98765 43210',
    logo_url: '',
    currency: 'INR',
    academic_year: '2025-26',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  };
  await db.collection('organizations').insertOne(org);

  // Users
  const passHash = await bcrypt.hash('password123', 10);
  const users = [
    { id: uuidv4(), email: 'super@gokulam360.com', password_hash: passHash, name: 'Super Admin', role: 'super_admin', organization_id: null, created_at: new Date().toISOString() },
    { id: uuidv4(), email: 'admin@iskcongokulam.org', password_hash: passHash, name: 'Radha Devi Dasi', role: 'org_admin', organization_id: orgId, created_at: new Date().toISOString() },
    { id: uuidv4(), email: 'teacher@iskcongokulam.org', password_hash: passHash, name: 'Govinda Das', role: 'teacher', organization_id: orgId, created_at: new Date().toISOString() },
  ];
  await db.collection('users').insertMany(users);

  // Programs
  const programs = [
    { id: uuidv4(), organization_id: orgId, name: 'Sunday School', description: 'Weekly spiritual education for children', age_group: '6-14', duration_months: 4, capacity: 60, start_date: '2025-06-01', end_date: '2025-09-30', days_of_week: [0], fee_amount: 1500, created_at: new Date().toISOString(), is_deleted: false },
    { id: uuidv4(), organization_id: orgId, name: 'Bhagavad Gita Course', description: 'Foundation Gita course for youth', age_group: '15-25', duration_months: 6, capacity: 40, start_date: '2025-07-01', end_date: '2025-12-31', days_of_week: [0, 6], fee_amount: 2000, created_at: new Date().toISOString(), is_deleted: false },
    { id: uuidv4(), organization_id: orgId, name: 'Gokulam Preschool', description: 'Krishna Conscious preschool', age_group: '3-5', duration_months: 12, capacity: 30, start_date: '2025-06-01', end_date: '2026-05-31', days_of_week: [1, 2, 3, 4, 5], fee_amount: 3000, created_at: new Date().toISOString(), is_deleted: false },
  ];
  await db.collection('programs').insertMany(programs);

  // Teachers
  const teachers = [
    { id: uuidv4(), organization_id: orgId, employee_id: 'T-001', name: 'Govinda Das', email: 'teacher@iskcongokulam.org', mobile: '+91 90000 11111', qualification: 'M.A. Sanskrit', skills: 'Gita teaching, Kirtan', address: 'Kochi', created_at: new Date().toISOString(), is_deleted: false },
    { id: uuidv4(), organization_id: orgId, employee_id: 'T-002', name: 'Yashoda Devi Dasi', email: 'yashoda@iskcongokulam.org', mobile: '+91 90000 22222', qualification: 'B.Ed', skills: 'Preschool, Storytelling', address: 'Kochi', created_at: new Date().toISOString(), is_deleted: false },
    { id: uuidv4(), organization_id: orgId, employee_id: 'T-003', name: 'Nitai Das', email: 'nitai@iskcongokulam.org', mobile: '+91 90000 33333', qualification: 'M.Sc.', skills: 'Youth mentoring', address: 'Kochi', created_at: new Date().toISOString(), is_deleted: false },
  ];
  await db.collection('teachers').insertMany(teachers);

  // Students
  const firstNames = ['Krishna', 'Radha', 'Arjun', 'Yashoda', 'Nitai', 'Gauranga', 'Tulsi', 'Madhava', 'Lila', 'Gopala', 'Sita', 'Bhakti'];
  const lastNames = ['Nair', 'Menon', 'Iyer', 'Sharma', 'Das', 'Kumar', 'Pillai', 'Krishnan'];
  const students = [];
  for (let i = 0; i < 24; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const status = i % 10 === 9 ? 'inactive' : 'active';
    students.push({
      id: uuidv4(),
      organization_id: orgId,
      student_id: 'GK-2025-' + String(101 + i).padStart(4, '0'),
      public_token: uuidv4(),
      first_name: fn,
      last_name: ln,
      dob: '20' + (12 + (i % 8)) + '-0' + ((i % 9) + 1) + '-1' + (i % 9),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      photo_url: '',
      address: 'Kochi, Kerala',
      mobile: '+91 98' + (100000000 + i * 137),
      email: (fn + '.' + ln + i).toLowerCase() + '@example.com',
      father_name: 'Sri ' + ln,
      mother_name: 'Smt ' + fn + ' Devi',
      guardian: 'Father',
      emergency_contact: '+91 90' + (100000000 + i * 91),
      initiated_name: i % 5 === 0 ? fn + ' Das' : '',
      counsellor: 'Nitai Das',
      temple: 'ISKCON Kochi',
      program_id: programs[i % programs.length].id,
      program_ids: i % 4 === 0 ? [programs[0].id, programs[1].id] : [programs[i % programs.length].id],
      status,
      admission_date: '2025-06-0' + ((i % 9) + 1),
      created_at: new Date().toISOString(),
      is_deleted: false,
    });
  }
  await db.collection('students').insertMany(students);

  // Enrollments
  await db.collection('enrollments').deleteMany({});
  // Attach generated sessions to programs (needed for session-quota)
  for (const p of programs) {
    const sess = generateSessions(p);
    await db.collection('programs').updateOne({ id: p.id }, { $set: { sessions: sess } });
  }
  const progWithSessions = await db.collection('programs').find({ organization_id: orgId }).toArray();
  const progMap = Object.fromEntries(progWithSessions.map(p => [p.id, p]));
  const enrollments = [];
  students.forEach(s => {
    (s.program_ids || [s.program_id]).filter(Boolean).forEach(pid => {
      const prog = progMap[pid];
      const credited = prog?.sessions?.length || 16;
      enrollments.push({
        id: uuidv4(), organization_id: orgId, student_id: s.id, program_id: pid,
        enrolled_at: s.admission_date || new Date().toISOString(),
        left_at: null, status: 'active',
        sessions_credited: credited,
        created_at: new Date().toISOString(),
      });
    });
  });
  if (enrollments.length) await db.collection('enrollments').insertMany(enrollments);

  // Parent user linked to first active student
  const parentStudent = students.find(s => s.status === 'active');
  await db.collection('users').insertOne({
    id: uuidv4(), email: 'parent@iskcongokulam.org', password_hash: passHash, name: 'Parent of ' + parentStudent.first_name,
    role: 'parent', organization_id: orgId, student_id: parentStudent.id, created_at: new Date().toISOString(),
  });

  // Fees
  const fees = students.slice(0, 20).map((s, i) => ({
    id: uuidv4(),
    organization_id: orgId,
    student_id: s.id,
    fee_type: i % 2 === 0 ? 'Term Fee' : 'Admission Fee',
    amount: i % 2 === 0 ? 1500 : 500,
    paid_amount: i % 3 === 0 ? 0 : (i % 2 === 0 ? 1500 : 500),
    status: i % 3 === 0 ? 'pending' : 'paid',
    due_date: '2025-07-15',
    created_at: new Date().toISOString(),
  }));
  await db.collection('fees').insertMany(fees);

  // Attendance (last 4 weeks Sunday)
  const attRecords = [];
  const today = new Date();
  for (let w = 0; w < 4; w++) {
    const d = new Date(today);
    d.setDate(d.getDate() - w * 7);
    const dateStr = d.toISOString().slice(0, 10);
    students.forEach((s, idx) => {
      const rand = (idx + w) % 10;
      let status = 'present';
      if (rand === 0) status = 'absent';
      else if (rand === 1) status = 'late';
      else if (rand === 2) status = 'excused';
      attRecords.push({
        id: uuidv4(),
        organization_id: orgId,
        student_id: s.id,
        program_id: s.program_id,
        date: dateStr,
        status,
        marked_by: users[2].id,
        created_at: new Date().toISOString(),
      });
    });
  }
  await db.collection('attendance').insertMany(attRecords);

  // Events
  const events = [
    { id: uuidv4(), organization_id: orgId, name: 'Janmashtami Celebration', date: '2025-08-16', description: 'Grand celebration of Krishna Janmashtami', created_at: new Date().toISOString() },
    { id: uuidv4(), organization_id: orgId, name: 'Gita Jayanti', date: '2025-12-11', description: 'Bhagavad Gita recital competition', created_at: new Date().toISOString() },
    { id: uuidv4(), organization_id: orgId, name: 'Summer Camp', date: '2025-07-20', description: 'Week-long spiritual camp', created_at: new Date().toISOString() },
  ];
  await db.collection('events').insertMany(events);

  // Seed activity feed
  const activityKinds = [
    { kind: 'student_added', title: 'New admission: Krishna Nair joined Sunday School', actor: 'Radha Devi Dasi' },
    { kind: 'attendance', title: 'Attendance marked for Bhagavad Gita Course', actor: 'Govinda Das' },
    { kind: 'fee_paid', title: 'Fee received from Arjun Iyer', actor: 'Radha Devi Dasi' },
    { kind: 'notification', title: 'SMS reminder sent to 12 parents', actor: 'Radha Devi Dasi' },
    { kind: 'event', title: 'Janmashtami event scheduled for August 16', actor: 'Nitai Das' },
    { kind: 'student_added', title: 'New admission: Tulsi Pillai joined Preschool', actor: 'Radha Devi Dasi' },
    { kind: 'fee_paid', title: 'Admission fee received from Yashoda Krishnan', actor: 'Radha Devi Dasi' },
  ];
  await db.collection('activity').deleteMany({});
  const activityDocs = activityKinds.map((a, i) => ({
    id: uuidv4(), organization_id: orgId, ...a,
    created_at: new Date(Date.now() - i * 3600 * 1000 * 4).toISOString(),
  }));
  await db.collection('activity').insertMany(activityDocs);

  return json({
    ok: true,
    message: 'Seed complete',
    credentials: [
      { role: 'super_admin', email: 'super@gokulam360.com', password: 'password123' },
      { role: 'org_admin', email: 'admin@iskcongokulam.org', password: 'password123' },
      { role: 'teacher', email: 'teacher@iskcongokulam.org', password: 'password123' },
      { role: 'parent', email: 'parent@iskcongokulam.org', password: 'password123' },
    ],
  });
}

// ============ ROUTER ============
async function router(req, method) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [resource, id, sub, action] = parts;
  const db = await getDb();

  // ---- public ----
  if (resource === 'health') return json({ ok: true, service: 'gokulam360' });

  // PUBLIC parent link — no auth required
  if (resource === 'public' && id === 'student' && sub && method === 'GET') {
    const student = await db.collection('students').findOne({ public_token: sub });
    if (!student) return json({ error: 'Not found' }, 404);
    const org = await db.collection('organizations').findOne({ id: student.organization_id });
    const enrollments = await db.collection('enrollments').find({ student_id: student.id, organization_id: student.organization_id }).sort({ enrolled_at: -1 }).toArray();
    const enrollmentProgramIds = enrollments.map(e => e.program_id).filter(Boolean);
    const assignedProgramIds = [...new Set([...(Array.isArray(student.program_ids) ? student.program_ids : []), student.program_id, ...enrollmentProgramIds].filter(Boolean))];
    const programs = await db.collection('programs').find({ organization_id: student.organization_id, id: { $in: assignedProgramIds } }).toArray();
    const pMap = Object.fromEntries(programs.map(p => [p.id, p]));
    const targetProgramIds = [...new Set(programs.flatMap(p => p.parent_program_id ? [p.parent_program_id] : [p.id]))];
    const att = await db.collection('attendance').find({ student_id: student.id, organization_id: student.organization_id }).sort({ date: -1 }).toArray();
    const fees = await db.collection('fees').find({ student_id: student.id, organization_id: student.organization_id }).toArray();
    const events = await db.collection('events')
      .find({
        organization_id: student.organization_id,
        is_announcement: true,
        is_deleted: { $ne: true },
        $or: [
          { program_ids: { $in: targetProgramIds } },
          { program_ids: { $exists: false } },
          { program_ids: { $size: 0 } },
        ],
      })
      .sort({ priority: -1, date: 1, created_at: -1 })
      .limit(50)
      .toArray();
    const enrichedEnr = enrollments.map(e => {
      const attended = att.filter(a => a.program_id === e.program_id && attendanceConsumesCredit(a.status) && a.date >= (e.enrolled_at || '').slice(0, 10)).length;
      const credited = e.sessions_credited || 0;
      return { ...stripId(e), program_name: pMap[e.program_id]?.name || '-', sessions_attended: attended, sessions_remaining: Math.max(0, credited - attended) };
    });
    const uniqueEvents = [...new Map(events.map(event => [event.id, event])).values()];
    return json({
      student: { id: student.id, student_id: student.student_id, first_name: student.first_name, last_name: student.last_name, photo_url: student.photo_url, dob: student.dob, program_id: student.program_id },
      organization: { name: org?.name, logo_url: org?.logo_url, contact_email: org?.contact_email, contact_phone: org?.contact_phone },
      enrollments: enrichedEnr,
      attendance: att.slice(0, 20).map(stripId),
      fees: fees.map(stripId),
      events: uniqueEvents.map(stripId),
    });
  }
  if (resource === 'config' && method === 'GET') {
    return json({ twilio_configured: !!twilioClient, providers: { sms: !!twilioClient, whatsapp: !!twilioClient } });
  }

  if (resource === 'seed' && method === 'POST') {
    // Seeding is destructive and is only available for an explicitly enabled
    // local demo environment. Once users exist, a super admin must authorize it.
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
      return json({ error: 'Not found' }, 404);
    }
    const hasUsers = await db.collection('users').countDocuments({}, { limit: 1 });
    if (hasUsers) {
      const seedAuth = await requireAuth(req, ['super_admin']);
      if (seedAuth.error) return seedAuth.error;
    }
    return handleSeed();
  }

  if (resource === 'auth') {
    if (id === 'login' && method === 'POST') {
      const body = await req.json();
      const user = await db.collection('users').findOne({ email: body.email });
      if (!user) return json({ error: 'Invalid credentials' }, 401);
      const ok = await bcrypt.compare(body.password || '', user.password_hash);
      if (!ok) return json({ error: 'Invalid credentials' }, 401);
      const org = user.organization_id ? await db.collection('organizations').findOne({ id: user.organization_id }) : null;
      const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role, organization_id: user.organization_id });
      return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organization_id: user.organization_id }, organization: org ? stripId(org) : null });
    }
    if (id === 'me' && method === 'GET') {
      const authRes = await requireAuth(req);
      if (authRes.error) return authRes.error;
      const u = authRes.user;
      const org = u.organization_id ? await db.collection('organizations').findOne({ id: u.organization_id }) : null;
      return json({ user: u, organization: org ? stripId(org) : null });
    }
    if (id === 'password' && sub === 'forgot' && action === 'request' && method === 'POST') {
      const body = await req.json();
      const email = normalizeAccountEmail(body.email);
      const account = await db.collection('users').findOne({ email });
      if (account) {
        const result = await issueAccountOtp(db, { email, userId: account.id, purpose: 'forgot_password', organizationId: account.organization_id });
        if (result.error) return json({ error: result.error }, 422);
      }
      return json({ message: 'If an account exists for that email, a verification code has been sent.' });
    }
    if (id === 'password' && sub === 'forgot' && action === 'confirm' && method === 'POST') {
      const body = await req.json();
      const email = normalizeAccountEmail(body.email);
      if (!body.new_password || String(body.new_password).length < 8 || !await consumeAccountOtp(db, { email, purpose: 'forgot_password', code: body.otp })) return json({ error: 'Invalid or expired verification code' }, 422);
      const account = await db.collection('users').findOne({ email });
      if (!account) return json({ error: 'Invalid or expired verification code' }, 422);
      await db.collection('users').updateOne({ id: account.id }, { $set: { password_hash: await bcrypt.hash(body.new_password, 10), password_updated_at: new Date().toISOString() } });
      await recordAccountAudit(db, { ...account, email }, 'password_reset');
      return json({ ok: true });
    }
    if (id === 'password' && sub === 'change' && action === 'request' && method === 'POST') {
      const authRes = await requireAuth(req);
      if (authRes.error) return authRes.error;
      const account = await db.collection('users').findOne({ id: authRes.user.id });
      const result = await issueAccountOtp(db, { email: account.email, userId: account.id, purpose: 'change_password', organizationId: account.organization_id });
      return result.error ? json({ error: result.error }, 422) : json({ ok: true, emailId: result.emailId });
    }
    if (id === 'password' && sub === 'change' && action === 'confirm' && method === 'POST') {
      const authRes = await requireAuth(req);
      if (authRes.error) return authRes.error;
      const body = await req.json();
      const account = await db.collection('users').findOne({ id: authRes.user.id });
      if (!body.new_password || String(body.new_password).length < 8 || !await consumeAccountOtp(db, { email: account.email, purpose: 'change_password', code: body.otp })) return json({ error: 'Invalid or expired verification code' }, 422);
      await db.collection('users').updateOne({ id: account.id }, { $set: { password_hash: await bcrypt.hash(body.new_password, 10), password_updated_at: new Date().toISOString() } });
      await recordAccountAudit(db, authRes.user, 'password_changed');
      return json({ ok: true });
    }
    if (id === 'me' && method === 'PUT') {
      const authRes = await requireAuth(req);
      if (authRes.error) return authRes.error;
      const body = await req.json();
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      if (!name) return json({ error: 'Name is required' }, 422);
      await db.collection('users').updateOne({ id: authRes.user.id }, { $set: { name, phone, updated_at: new Date().toISOString() } });
      await recordAccountAudit(db, authRes.user, 'account_updated', { fields: ['name', 'phone'] });
      return json({ ok: true, user: { ...authRes.user, name, phone } });
    }
  }

  // ---- protected ----
  const authRes = await requireAuth(req);
  if (authRes.error) return authRes.error;
  const user = authRes.user;

  if (resource === 'ask-ai' && method === 'POST' && !id) {
    const body = await req.json();
    return answerAskAI(db, user, body.question);
  }

  // Organizations
  if (resource === 'organizations') {
    if (method === 'GET' && !id) {
      if (user.role !== 'super_admin') return json({ error: 'Forbidden' }, 403);
      const orgs = await db.collection('organizations').find({ is_deleted: { $ne: true } }).toArray();
      return json({ items: orgs.map(stripId) });
    }
    if (method === 'POST' && !id) {
      if (user.role !== 'super_admin') return json({ error: 'Forbidden' }, 403);
      const body = await req.json();
      const doc = { id: uuidv4(), name: body.name, address: body.address, contact_email: body.contact_email, contact_phone: body.contact_phone, currency: body.currency || 'INR', academic_year: body.academic_year || '2025-26', logo_url: body.logo_url || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_deleted: false };
      await db.collection('organizations').insertOne(doc);
      // Create org admin
      if (body.admin_email && body.admin_password) {
        const passHash = await bcrypt.hash(body.admin_password, 10);
        await db.collection('users').insertOne({
          id: uuidv4(), email: body.admin_email, password_hash: passHash, name: body.admin_name || 'Admin',
          role: 'org_admin', organization_id: doc.id, created_at: new Date().toISOString()
        });
      }
      // Create first program
      if (body.first_program?.name) {
        await db.collection('programs').insertOne({
          id: uuidv4(), organization_id: doc.id, name: body.first_program.name,
          description: body.first_program.description || '', age_group: body.first_program.age_group || '',
          duration_months: Number(body.first_program.duration_months) || 4, capacity: Number(body.first_program.capacity) || 30,
          start_date: body.first_program.start_date || '', end_date: body.first_program.end_date || '',
          created_at: new Date().toISOString(), is_deleted: false,
        });
      }
      // Log
      await db.collection('activity').insertOne({
        id: uuidv4(), organization_id: doc.id, kind: 'org_created',
        title: `Organization "${doc.name}" created`, actor: user.name, created_at: new Date().toISOString(),
      });
      return json(stripId(doc));
    }
    if (method === 'PUT' && id) {
      if (user.role !== 'super_admin' && !(user.role === 'org_admin' && user.organization_id === id)) return json({ error: 'Forbidden' }, 403);
      const body = await req.json();
      await db.collection('organizations').updateOne({ id }, { $set: { ...body, updated_at: new Date().toISOString() } });
      const doc = await db.collection('organizations').findOne({ id });
      return json(stripId(doc));
    }
    if (method === 'DELETE' && id) {
      if (user.role !== 'super_admin') return json({ error: 'Forbidden' }, 403);
      await db.collection('organizations').updateOne({ id }, { $set: { is_deleted: true } });
      return json({ ok: true });
    }
  }

  // Generic collection handler
  const collectionRoutes = {
    students: ['org_admin', 'teacher', 'super_admin'],
    teachers: ['org_admin', 'super_admin'],
    programs: ['org_admin', 'teacher', 'super_admin'],
    fees: ['org_admin', 'super_admin'],
    events: ['org_admin', 'teacher', 'super_admin'],
    attendance: ['org_admin', 'teacher', 'super_admin'],
  };

  if (collectionRoutes[resource]) {
    const allowed = collectionRoutes[resource];
    if (!allowed.includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const col = db.collection(resource);

    if (method === 'GET' && !id) {
       const q = orgScope(user, { is_deleted: { $ne: true } });
       // Support filter query params
       const params = Object.fromEntries(url.searchParams.entries());
       // Never allow a client to replace tenant or lifecycle constraints.
       Object.keys(params).forEach(k => {
         if (!['organization_id', 'is_deleted', '_id'].includes(k)) q[k] = params[k];
       });
      const items = await col.find(q).sort({ created_at: -1 }).limit(500).toArray();
      return json({ items: items.map(stripId) });
    }
    if (method === 'GET' && id && !sub) {
      const doc = await col.findOne({ id, ...orgScope(user) });
      if (!doc) return json({ error: 'Not found' }, 404);
      return json(stripId(doc));
    }
    if (method === 'POST' && !id) {
       const body = await req.json();
       const enrollmentDetails = resource === 'students' ? (body.enrollment_details || {}) : {};
       const { enrollment_details: ignoredEnrollmentDetails, ...persistedBody } = body;
       const organizationId = user.role === 'super_admin' ? body.organization_id : user.organization_id;
       if (!organizationId) return json({ error: 'organization_id is required' }, 400);
       if (resource === 'programs') {
         const requestedModel = persistedBody.billing_model || 'credit';
         if (!['credit', 'date'].includes(requestedModel)) return json({ error: 'billing_model must be credit or date' }, 422);
         if (persistedBody.parent_program_id) {
           const parent = await db.collection('programs').findOne({ id: persistedBody.parent_program_id, ...orgScope(user) });
           if (!parent) return json({ error: 'Parent program not found' }, 404);
           persistedBody.billing_model = parent.billing_model || 'credit';
         } else {
           persistedBody.billing_model = requestedModel;
         }
       }
       const doc = {
         id: uuidv4(),
         ...persistedBody,
         // Tenant ownership is always decided by the server.
         organization_id: organizationId,
         created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
      };
      if (resource === 'students' && doc.status === 'active') doc.active_from = doc.created_at;
      // Auto-generate public token for students
      if (resource === 'students' && !doc.public_token) doc.public_token = uuidv4();
      if (resource === 'events') {
        const targetProgramIds = Array.isArray(doc.program_ids) ? [...new Set(doc.program_ids.filter(Boolean))] : [];
        doc.program_ids = targetProgramIds;
        if (doc.is_announcement && targetProgramIds.length) {
          const validPrograms = await db.collection('programs').find({ organization_id: organizationId, id: { $in: targetProgramIds } }).toArray();
          if (validPrograms.length !== targetProgramIds.length || validPrograms.some(program => program.parent_program_id)) return json({ error: 'One or more selected programs were not found' }, 422);
          for (const programId of targetProgramIds) {
            const selectedCount = await db.collection('events').countDocuments({ organization_id: organizationId, is_announcement: true, is_deleted: { $ne: true }, program_ids: programId });
            if (selectedCount >= 3) return json({ error: 'Each program can have at most 3 featured events' }, 400);
          }
        } else if (doc.is_announcement) {
          const selectedCount = await db.collection('events').countDocuments({ organization_id: organizationId, is_announcement: true, is_deleted: { $ne: true }, $or: [{ program_ids: { $exists: false } }, { program_ids: { $size: 0 } }] });
          if (selectedCount >= 3) return json({ error: 'Only 3 organization-wide featured events are allowed' }, 400);
        }
      }
      // Generate sessions for programs
      if (resource === 'programs') doc.sessions = generateSessions(doc);
      await col.insertOne(doc);
      // Handle student enrollments
      if (resource === 'students' && doc.program_ids?.length) {
        await syncEnrollments(db, doc, [], enrollmentDetails, { reuseExistingCredits: false });
      }
      // Log activity for known resources
      if (['students', 'teachers', 'events', 'programs'].includes(resource)) {
        const titleMap = {
          students: `New admission: ${doc.first_name || ''} ${doc.last_name || ''}`.trim(),
          teachers: `Teacher added: ${doc.name || ''}`,
          events: `Event scheduled: ${doc.name || ''}`,
          programs: `Program created: ${doc.name || ''}`,
        };
        await db.collection('activity').insertOne({
          id: uuidv4(), organization_id: user.organization_id, kind: resource.slice(0, -1) + '_added',
          title: titleMap[resource], actor: user.name || 'Admin', created_at: new Date().toISOString(),
        });
      }
      return json(stripId(doc));
    }
    if (method === 'PUT' && id) {
       const body = await req.json();
       const before = await col.findOne({ id, ...orgScope(user) });
       if (!before) return json({ error: 'Not found' }, 404);
       // Do not let callers move records between tenants or alter server-owned fields.
       const { id: ignoredId, organization_id: ignoredOrganizationId, created_at: ignoredCreatedAt, updated_at: ignoredUpdatedAt, is_deleted: ignoredDeleted, enrollment_details: ignoredEnrollmentDetails, ...changes } = body;
       const updated = { ...changes, updated_at: new Date().toISOString() };
      if (resource === 'students' && changes.status && changes.status !== before.status) {
        updated.status_changed_at = updated.updated_at;
        if (changes.status === 'active') updated.active_from = updated.updated_at;
      }
      if (resource === 'events') {
        const featured = changes.is_announcement ?? before.is_announcement;
        const targetProgramIds = Array.isArray(changes.program_ids) ? [...new Set(changes.program_ids.filter(Boolean))] : (Array.isArray(before.program_ids) ? before.program_ids : []);
        updated.program_ids = targetProgramIds;
        if (featured && targetProgramIds.length) {
          const validPrograms = await db.collection('programs').find({ organization_id: before.organization_id, id: { $in: targetProgramIds } }).toArray();
          if (validPrograms.length !== targetProgramIds.length || validPrograms.some(program => program.parent_program_id)) return json({ error: 'One or more selected programs were not found' }, 422);
          for (const programId of targetProgramIds) {
            const selectedCount = await db.collection('events').countDocuments({ organization_id: before.organization_id, is_announcement: true, is_deleted: { $ne: true }, id: { $ne: id }, program_ids: programId });
            if (selectedCount >= 3) return json({ error: 'Each program can have at most 3 featured events' }, 400);
          }
        } else if (featured) {
          const selectedCount = await db.collection('events').countDocuments({ organization_id: before.organization_id, is_announcement: true, is_deleted: { $ne: true }, id: { $ne: id }, $or: [{ program_ids: { $exists: false } }, { program_ids: { $size: 0 } }] });
          if (selectedCount >= 3) return json({ error: 'Only 3 organization-wide featured events are allowed' }, 400);
        }
      }
      if (resource === 'programs') {
        const nextModel = before.parent_program_id ? (before.billing_model || 'credit') : (body.billing_model || before.billing_model || 'credit');
        if (!['credit', 'date'].includes(nextModel)) return json({ error: 'billing_model must be credit or date' }, 422);
        updated.billing_model = nextModel;
        updated.sessions = generateSessions({ ...before, ...body });
      }
      await col.updateOne({ id, ...orgScope(user) }, { $set: updated });
       const doc = await col.findOne({ id, ...orgScope(user) });
      // Sync student enrollments diff
      if (resource === 'students' && body.program_ids) {
        await syncEnrollments(db, doc, before?.program_ids || [], body.enrollment_details || {}, { reuseExistingCredits: true });
      }
      return json(stripId(doc));
    }
    if (method === 'DELETE' && id) {
      const existing = await col.findOne({ id, ...orgScope(user) });
      if (!existing) return json({ error: 'Not found' }, 404);
      if (resource === 'students') {
        const fees = await db.collection('fees').deleteMany({ student_id: id, ...orgScope(user) });
        await col.updateOne({ id, ...orgScope(user) }, { $set: { is_deleted: true, updated_at: new Date().toISOString() } });
        await db.collection('activity').insertOne({
          id: uuidv4(), organization_id: existing.organization_id, kind: 'student_deleted',
          title: `Student deleted: ${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
          meta: { student_id: id, deleted_fee_records: fees.deletedCount || 0 },
          actor: user.name || 'Admin', created_at: new Date().toISOString(),
        });
        return json({ ok: true, deleted_fee_records: fees.deletedCount || 0 });
      }
      await col.updateOne({ id, ...orgScope(user) }, { $set: { is_deleted: true, updated_at: new Date().toISOString() } });
      return json({ ok: true });
    }
  }

  // Enrollments endpoints
  if (resource === 'enrollments') {
    if (method === 'POST' && id === 'credits') {
      if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
      const body = await req.json();
      const quantity = Number(body.credit_quantity);
      const totalAmount = Number(body.total_amount ?? body.fee_amount);
      const amountPaid = Number(body.amount_paid ?? totalAmount);
      if (!body.enrollment_id || !Number.isInteger(quantity) || quantity <= 0) return json({ error: 'A positive whole-number credit quantity is required' }, 422);
      if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > totalAmount) return json({ error: 'Valid total and paid amounts are required; paid cannot exceed total' }, 422);
      const enrollment = await db.collection('enrollments').findOne({ id: body.enrollment_id, ...orgScope(user), left_at: null, status: 'active' });
      if (!enrollment) return json({ error: 'Active enrollment not found' }, 404);
      const program = await db.collection('programs').findOne({ id: enrollment.program_id, ...orgScope(user) });
      if ((program?.billing_model || 'credit') !== 'credit') return json({ error: 'Additional credits are available only for Credit model batches' }, 422);
      const now = new Date().toISOString();
      await db.collection('enrollments').updateOne(
        { id: enrollment.id, ...orgScope(user) },
        { $inc: { sessions_credited: quantity }, $set: { updated_at: now } },
      );
      if (totalAmount > 0 || amountPaid > 0) {
        await db.collection('fees').insertOne({
          id: uuidv4(), organization_id: enrollment.organization_id, student_id: enrollment.student_id,
          program_id: enrollment.program_id, fee_type: 'Credit Purchase', amount: totalAmount, paid_amount: amountPaid,
          payment_mode: body.payment_mode || 'cash',
          collection_date: body.collection_date || null,
          collected_by: body.collected_by || null,
          notes: body.notes || '',
          payment_history: amountPaid > 0 ? [{ id: uuidv4(), amount: amountPaid, mode: body.payment_mode || 'cash', collection_date: body.collection_date || null, collected_by: body.collected_by || null, notes: body.notes || '', recorded_at: now }] : [],
          credit_quantity: quantity,
          status: amountPaid >= totalAmount && totalAmount > 0 ? 'paid' : 'pending',
          created_at: now, updated_at: now,
        });
      }
      return json({ ok: true, enrollment_id: enrollment.id, credits_added: quantity, total_amount: totalAmount, amount_paid: amountPaid, outstanding_amount: Math.max(0, totalAmount - amountPaid) });
    }
    if (method === 'GET') {
      const q = orgScope(user);
      const url2 = new URL(req.url);
      if (url2.searchParams.get('student_id')) q.student_id = url2.searchParams.get('student_id');
      if (url2.searchParams.get('program_id')) q.program_id = url2.searchParams.get('program_id');
      const items = await db.collection('enrollments').find(q).sort({ enrolled_at: -1 }).toArray();
      const progIds = [...new Set(items.map(e => e.program_id))];
      const progs = await db.collection('programs').find({ id: { $in: progIds } }).toArray();
      const pMap = Object.fromEntries(progs.map(p => [p.id, p]));
      // compute attendance-based sessions_attended per enrollment
      const attRecs = await db.collection('attendance').find({ organization_id: user.organization_id }).toArray();
      const enriched = items.map(e => {
        const enrolledDate = (e.enrolled_at || '').slice(0, 10);
        const attended = attRecs.filter(a => a.student_id === e.student_id && a.program_id === e.program_id && ['present', 'absent', 'late'].includes(a.status) && a.date >= enrolledDate).length;
        const credited = e.sessions_credited || (pMap[e.program_id]?.sessions?.length || 0);
        const remaining = Math.max(0, credited - attended);
        return { ...stripId(e), program_name: pMap[e.program_id]?.name || '-', program: pMap[e.program_id] ? stripId(pMap[e.program_id]) : null, sessions_credited: credited, sessions_attended: attended, sessions_remaining: remaining };
      });
      return json({ items: enriched });
    }
    // Renew an enrollment: create a fresh one with a new quota
    if (method === 'POST' && id === 'renew') {
      const body = await req.json(); // { enrollment_id }
      const old = await db.collection('enrollments').findOne({ id: body.enrollment_id, organization_id: user.organization_id });
      if (!old) return json({ error: 'Enrollment not found' }, 404);
      const prog = await db.collection('programs').findOne({ id: old.program_id });
      const credited = prog?.sessions?.length || 16;
      const now = new Date().toISOString();
      // Mark previous as completed
      await db.collection('enrollments').updateOne({ id: old.id }, { $set: { status: 'completed', left_at: now } });
      const fresh = {
        id: uuidv4(), organization_id: user.organization_id, student_id: old.student_id, program_id: old.program_id,
        enrolled_at: now, left_at: null, status: 'active', sessions_credited: credited,
        renewed_from: old.id, created_at: now,
      };
      await db.collection('enrollments').insertOne(fresh);
      if (prog?.fee_amount) {
        await db.collection('fees').insertOne({
          id: uuidv4(), organization_id: user.organization_id, student_id: old.student_id, program_id: old.program_id,
          fee_type: 'Term Fee (Renewal)', amount: prog.fee_amount, paid_amount: 0, status: 'pending',
          due_date: now.slice(0, 10), created_at: now,
        });
      }
      return json(stripId(fresh));
    }
  }

  // Sessions for a program
  if (resource === 'programs' && id && sub === 'sessions' && method === 'GET') {
    const prog = await db.collection('programs').findOne({ id, ...orgScope(user) });
    if (!prog) return json({ error: 'Not found' }, 404);
    const cancelledDates = new Set(prog.cancelled_dates || []);
    const postponedDates = prog.postponed_dates || {};
    let sessions = prog.sessions;
    if (!sessions || !sessions.length) sessions = generateSessions(prog);
    sessions = [...new Set([...(sessions || []), ...cancelledDates])].sort();
    await finalizePastStudentAttendance(db, user, id, sessions);
    // Attach attendance count per session
    const att = await db.collection('attendance').find({ program_id: id, organization_id: user.organization_id }).toArray();
    const byDate = {};
    att.forEach(a => { if (!byDate[a.date]) byDate[a.date] = { total: 0, present: 0 }; byDate[a.date].total++; if (a.status === 'present' || a.status === 'late') byDate[a.date].present++; });
    const enriched = sessions.map(d => {
      const postponedEntry = Object.entries(postponedDates).find(([, newDate]) => newDate === d);
      const postponedFrom = postponedEntry?.[0] || '';
      return {
      date: d, day_name: new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' }),
      cancelled: cancelledDates.has(d),
      cancellation_reason: prog.cancellation_reasons?.[d] || '',
      postponed_from: postponedFrom,
      postponement_reason: postponedFrom ? (prog.postponement_reasons?.[postponedFrom] || '') : '',
      marked: !cancelledDates.has(d) && !!byDate[d], present: byDate[d]?.present || 0, total: byDate[d]?.total || 0,
      is_past: new Date(d) < new Date().setHours(0, 0, 0, 0),
      is_today: d === new Date().toISOString().slice(0, 10),
      };
    });
    return json({ program_id: id, program_name: prog.name, days_of_week: prog.days_of_week, sessions: enriched });
  }

  // Bulk attendance
  // Faculty attendance is kept separate from student attendance because it must
  // never participate in student credit consumption.
  if (resource === 'faculty-attendance' && method === 'GET') {
    if (!['org_admin', 'teacher', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const date = url.searchParams.get('date');
    const query = { ...orgScope(user), faculty_id: { $exists: true } };
    if (date) query.date = date;
    const items = await db.collection('attendance').find(query).sort({ date: -1, created_at: -1 }).limit(500).toArray();
    return json({ items: items.map(stripId) });
  }

  if (resource === 'faculty-attendance' && method === 'POST') {
    if (!['org_admin', 'teacher', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const { date, records } = body;
    const validStatuses = new Set(['present', 'absent']);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Array.isArray(records) || !records.length) {
      return json({ error: 'date and non-empty records are required' }, 400);
    }
    if (records.some(r => !r?.faculty_id || !validStatuses.has(r.status))) return json({ error: 'Invalid faculty attendance record' }, 400);
    const facultyIds = [...new Set(records.map(r => r.faculty_id))];
    const matchingFaculty = await db.collection('teachers').countDocuments({
      id: { $in: facultyIds },
      ...orgScope(user),
      is_deleted: { $ne: true },
    });
    if (matchingFaculty !== facultyIds.length) return json({ error: 'One or more faculty members do not belong to this organization' }, 400);
    await db.collection('attendance').deleteMany({
      organization_id: user.organization_id,
      date,
      faculty_id: { $in: facultyIds },
    });
    const docs = records.map(r => ({
      id: uuidv4(),
      organization_id: user.organization_id,
      faculty_id: r.faculty_id,
      attendance_type: 'faculty',
      date,
      status: r.status,
      marked_by: user.id,
      created_at: new Date().toISOString(),
    }));
    await db.collection('attendance').insertMany(docs);
    return json({ ok: true, count: docs.length });
  }

  if (resource === 'attendance-bulk' && method === 'POST') {
    if (!['org_admin', 'teacher', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const { date, program_id, records } = body; // records: [{student_id, status}]
    const validStatuses = new Set(['present', 'absent', 'late', 'excused']);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !program_id || !Array.isArray(records) || !records.length) {
      return json({ error: 'date, program_id, and non-empty records are required' }, 400);
    }
    if (records.some(r => !r?.student_id || !validStatuses.has(r.status))) return json({ error: 'Invalid attendance record' }, 400);
    const program = await db.collection('programs').findOne({ id: program_id, ...orgScope(user) });
    if (!program) return json({ error: 'Program not found' }, 404);
    const studentIds = [...new Set(records.map(r => r.student_id))];
    const matchingStudents = await db.collection('students').countDocuments({ id: { $in: studentIds }, ...orgScope(user), is_deleted: { $ne: true } });
    if (matchingStudents !== studentIds.length) return json({ error: 'One or more students do not belong to this organization' }, 400);
    // Remove existing for this date+program+org
    await db.collection('attendance').deleteMany({ organization_id: user.organization_id, date, program_id });
    const docs = records.map(r => ({
      id: uuidv4(),
      organization_id: user.organization_id,
      program_id,
      date,
      student_id: r.student_id,
      status: r.status,
      marked_by: user.id,
      created_at: new Date().toISOString(),
    }));
    if (docs.length) await db.collection('attendance').insertMany(docs);

    // Keep the enrollment projection immediately consistent with the immutable
    // attendance records that were just saved. Reads still recalculate from history.
    for (const studentId of studentIds) {
      const enrollment = await db.collection('enrollments').findOne({
        organization_id: user.organization_id,
        student_id: studentId,
        program_id,
        left_at: null,
      });
      if (!enrollment) continue;
      const attendanceHistory = await db.collection('attendance').find({
        organization_id: user.organization_id,
        student_id: studentId,
        program_id,
      }).toArray();
      const used = attendanceHistory.filter(a => attendanceConsumesCredit(a.status)).length;
      const credited = Number(enrollment.sessions_credited || 0);
      await db.collection('enrollments').updateOne(
        { id: enrollment.id, organization_id: user.organization_id },
        { $set: { sessions_attended: used, sessions_remaining: Math.max(0, credited - used), updated_at: new Date().toISOString() } },
      );
    }
    return json({ ok: true, count: docs.length });
  }

  // Dashboard stats
  if (resource === 'dashboard' && method === 'GET') {
    const scope = orgScope(user, { is_deleted: { $ne: true } });
    const students = await db.collection('students').find(scope).toArray();
    const teachers = await db.collection('teachers').find(scope).toArray();
    const feesScope = user.role === 'super_admin' ? {} : { organization_id: user.organization_id };
    const fees = await db.collection('fees').find(feesScope).toArray();
    const events = await db.collection('events').find(feesScope).toArray();
    const attendance = await db.collection('attendance').find(feesScope).toArray();

    const activeStudents = students.filter(s => s.status === 'active').length;
    const totalStudents = students.length;
    const pendingFees = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);
    const collectedFees = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
    const attPresent = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attTotal = attendance.length || 1;
    const attendancePct = Math.round((attPresent / attTotal) * 100);

    // Monthly admissions (last 6 months)
    const monthly = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en', { month: 'short' });
      monthly[key] = 0;
    }
    students.forEach(s => {
      const d = new Date(s.admission_date || s.created_at);
      const key = d.toLocaleString('en', { month: 'short' });
      if (key in monthly) monthly[key]++;
    });
    const monthlyAdmissions = Object.entries(monthly).map(([month, count]) => ({ month, count }));

    // Attendance trend (by date)
    const trend = {};
    attendance.forEach(a => {
      if (!trend[a.date]) trend[a.date] = { date: a.date, present: 0, absent: 0 };
      if (a.status === 'present' || a.status === 'late') trend[a.date].present++;
      else trend[a.date].absent++;
    });
    const attendanceTrend = Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));

    // Fee split
    const feeSplit = [
      { name: 'Collected', value: collectedFees },
      { name: 'Pending', value: pendingFees },
    ];

    return json({
      totalStudents,
      activeStudents,
      newAdmissions: students.filter(s => {
        const d = new Date(s.admission_date || s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      attendancePct,
      pendingFees,
      collectedFees,
      totalTeachers: teachers.length,
      upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).slice(0, 5),
      monthlyAdmissions,
      attendanceTrend,
      feeSplit,
    });
  }

  // Notifications (mock sender)
  if (resource === 'notifications') {
    if (!['org_admin', 'teacher', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const col = db.collection('notifications');
    if (method === 'GET' && !id) {
      const items = await col.find(orgScope(user)).sort({ created_at: -1 }).limit(200).toArray();
      return json({ items: items.map(stripId) });
    }
    if (method === 'POST' && !id) {
      const body = await req.json();
      // body: { channel: 'sms'|'whatsapp', recipients: [{name,phone}], message, kind }
       const channel = body.channel || 'sms';
       const recipients = body.recipients || [];
       const message = body.message || '';
       if (!['sms', 'whatsapp'].includes(channel)) return json({ error: 'Invalid channel' }, 400);
       if (!Array.isArray(recipients) || !recipients.length || recipients.length > 200) return json({ error: '1 to 200 recipients are required' }, 400);
       if (typeof message !== 'string' || !message.trim() || message.length > 1000) return json({ error: 'A message up to 1000 characters is required' }, 400);
       if (recipients.some(r => !r || typeof r.name !== 'string' || !normalizePhone(r.phone))) return json({ error: 'Every recipient needs a valid phone number' }, 400);

      // Fan-out to Twilio (or mock)
      const deliveries = [];
      for (const r of recipients) {
        const res = await sendTwilioMessage(channel, r.phone, message);
        deliveries.push({ name: r.name, phone: r.phone, ...res });
      }
      const sentCount = deliveries.filter(d => d.status !== 'failed' && d.status !== 'mock').length;
      const mockCount = deliveries.filter(d => d.status === 'mock').length;
      const failCount = deliveries.filter(d => d.status === 'failed').length;

      const doc = {
        id: uuidv4(),
        organization_id: user.organization_id,
        channel,
        kind: body.kind || 'custom',
        message,
        recipients,
        deliveries,
        status: sentCount > 0 ? 'sent' : (mockCount === deliveries.length ? 'mock' : 'partial'),
        provider: twilioClient ? 'twilio' : 'mock',
        stats: { total: deliveries.length, sent: sentCount, failed: failCount, mock: mockCount },
        sent_by: user.id,
        created_at: new Date().toISOString(),
      };
      await col.insertOne(doc);
      await db.collection('activity').insertOne({
        id: uuidv4(), organization_id: user.organization_id, kind: 'notification',
        title: `${channel.toUpperCase()} sent to ${sentCount || mockCount} recipient(s)`,
        meta: { channel, kind: body.kind }, actor: user.name, created_at: new Date().toISOString(),
      });
      return json(stripId(doc));
    }
  }

  // Activity feed
  if (resource === 'activity' && method === 'GET') {
    const items = await db.collection('activity').find(orgScope(user)).sort({ created_at: -1 }).limit(30).toArray();
    return json({ items: items.map(stripId) });
  }

  // Parent portal - get current parent's child
  if (resource === 'parent' && id === 'me' && method === 'GET') {
    if (user.role !== 'parent') return json({ error: 'Forbidden' }, 403);
    const userDoc = await db.collection('users').findOne({ id: user.id });
    const studentId = userDoc?.student_id;
    if (!studentId) return json({ error: 'No child linked' }, 404);
    const student = await db.collection('students').findOne({ id: studentId });
    const att = await db.collection('attendance').find({ student_id: studentId }).sort({ date: -1 }).limit(20).toArray();
    const fees = await db.collection('fees').find({ student_id: studentId }).toArray();
    return json({ student: stripId(student), attendance: att.map(stripId), fees: fees.map(stripId) });
  }

  // Reports endpoint - returns comprehensive report data
  if (resource === 'reports' && method === 'GET') {
    const type = id;
    const scope = orgScope(user);
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value);
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to)) {
      return json({ error: 'Invalid date range' }, 400);
    }
    const dateFilter = field => {
      const bounds = {};
      if (from) bounds.$gte = from;
      if (to) bounds.$lte = to;
      return Object.keys(bounds).length ? { [field]: bounds } : {};
    };
    if (type === 'students') {
      const items = await db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray();
      return json({ items: items.map(stripId) });
    }
    if (type === 'attendance') {
      const query = { ...scope, ...dateFilter('date'), student_id: { $exists: true } };
      const items = await db.collection('attendance').find(query).sort({ date: -1, created_at: -1 }).toArray();
      const students = await db.collection('students').find(scope).toArray();
      const sMap = Object.fromEntries(students.map(s => [s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.student_id || '-']));
      const counts = { present: 0, late: 0, absent: 0, excused: 0 };
      const reportItems = items.map(a => {
        const status = a.status || 'unknown';
        if (status in counts) counts[status] += 1;
        return {
          ...stripId(a),
          session_date: a.date || '-',
          student_name: sMap[a.student_id] || a.student_id || '-',
          status,
        };
      });
      counts.total = reportItems.length;
      return json({ items: reportItems, summary: counts, filters: { from, to } });
    }
    if (type === 'fees') {
      const programId = url.searchParams.get('program_id') || '';
      const batchId = url.searchParams.get('batch_id') || '';
      const studentId = url.searchParams.get('student_id') || '';
      const paymentStatus = url.searchParams.get('status') || '';
      const fees = await db.collection('fees').find(scope).sort({ collection_date: -1, created_at: -1 }).toArray();
      const students = await db.collection('students').find(scope).toArray();
      const programs = await db.collection('programs').find(scope).toArray();
      const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
      const programMap = Object.fromEntries(programs.map(p => [p.id, p]));
      const records = fees.filter(f => {
        const batch = programMap[f.program_id];
        const effectiveDate = String(f.collection_date || f.paid_at || f.due_date || f.created_at || '').slice(0, 10);
        const matchesProgram = !programId || batch?.parent_program_id === programId || f.program_id === programId;
        const matchesBatch = !batchId || f.program_id === batchId;
        const matchesStudent = !studentId || f.student_id === studentId;
        const matchesStatus = !paymentStatus || f.status === paymentStatus;
        const matchesFrom = !from || effectiveDate >= from;
        const matchesTo = !to || effectiveDate <= to;
        return matchesProgram && matchesBatch && matchesStudent && matchesStatus && matchesFrom && matchesTo;
      });
      const reportItems = records.map(f => {
        const student = studentMap[f.student_id];
        const batch = programMap[f.program_id];
        const program = batch?.parent_program_id ? programMap[batch.parent_program_id] : batch;
        const amountMinor = Number.isFinite(Number(f.amount_minor)) ? Number(f.amount_minor) : Math.round(Number(f.amount || 0) * 100);
        const paidMinor = Number.isFinite(Number(f.paid_amount_minor)) ? Number(f.paid_amount_minor) : Math.round(Number(f.paid_amount || 0) * 100);
        return {
          id: f.id,
          student_name: [student?.first_name, student?.last_name].filter(Boolean).join(' ') || student?.student_id || '-',
          program_name: program?.name || '-',
          batch_name: batch?.parent_program_id ? batch.name : '-',
          amount_minor: amountMinor,
          amount_paid_minor: paidMinor,
          pending_amount_minor: Math.max(0, amountMinor - paidMinor),
          payment_date: f.collection_date || f.paid_at || f.created_at || f.due_date || '-',
          payment_mode: f.payment_mode || '-',
          collected_by: f.collected_by || '-',
          status: f.status || (paidMinor >= amountMinor ? 'paid' : 'pending'),
          fee_type: f.fee_type || 'Payment',
          due_date: f.due_date || '-',
        };
      });
      return json({ items: reportItems, filters: { program_id: programId, batch_id: batchId, student_id: studentId, status: paymentStatus, from, to } });
    }
    if (type === 'attendance-summary') {
      const students = await db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray();
      const attendance = await db.collection('attendance').find({ ...scope, ...dateFilter('date') }).toArray();
      const summary = students.map(s => {
        const sRecs = attendance.filter(a => a.student_id === s.id);
        const months = {};
        sRecs.forEach(a => {
          const key = a.date.slice(0, 7);
          if (!months[key]) months[key] = { present: 0, total: 0 };
          months[key].total++;
          if (a.status === 'present' || a.status === 'late') months[key].present++;
        });
        const monthly = Object.fromEntries(Object.entries(months).map(([k, v]) => [k, v.total ? Math.round((v.present / v.total) * 100) : 0]));
        const totalPresent = sRecs.filter(a => a.status === 'present' || a.status === 'late').length;
        const overall = sRecs.length ? Math.round((totalPresent / sRecs.length) * 100) : 0;
        return { student_id: s.student_id, name: `${s.first_name} ${s.last_name}`, overall, monthly, total_sessions: sRecs.length, present: totalPresent };
      });
      const allMonths = Array.from(new Set(attendance.map(a => a.date.slice(0, 7)))).sort();
      return json({ months: allMonths, students: summary });
    }
    return json({ error: 'Unknown report' }, 400);
  }

  // Bulk import students
  if (resource === 'students-import' && method === 'POST') {
    if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const programs = await db.collection('programs').find({ organization_id: user.organization_id }).toArray();
    const pMap = Object.fromEntries(programs.map(p => [p.name.toLowerCase(), p.id]));
    const docs = [];
    const errors = [];
    rows.forEach((r, idx) => {
      const first_name = (r.first_name || r['First Name'] || '').trim();
      const last_name = (r.last_name || r['Last Name'] || '').trim();
      if (!first_name && !last_name) { errors.push({ row: idx + 2, error: 'Missing name' }); return; }
      const programName = (r.program || r['Program'] || '').toLowerCase().trim();
      docs.push({
        id: uuidv4(),
        organization_id: user.organization_id,
        student_id: (r.student_id || r['Student ID'] || 'GK-2025-' + String(Math.floor(1000 + Math.random() * 9000))).toString(),
        first_name, last_name,
        dob: r.dob || r['DOB'] || '',
        gender: r.gender || r['Gender'] || 'Male',
        mobile: r.mobile || r['Mobile'] || '',
        email: r.email || r['Email'] || '',
        father_name: r.father_name || r['Father Name'] || '',
        mother_name: r.mother_name || r['Mother Name'] || '',
        emergency_contact: r.emergency_contact || r['Emergency Contact'] || '',
        address: r.address || r['Address'] || '',
        program_id: pMap[programName] || '',
        status: (r.status || r['Status'] || 'active').toLowerCase(),
        admission_date: r.admission_date || r['Admission Date'] || new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
      });
    });
    if (docs.length) await db.collection('students').insertMany(docs);
    await db.collection('activity').insertOne({
      id: uuidv4(), organization_id: user.organization_id, kind: 'student_added',
      title: `Bulk import: ${docs.length} students added`, actor: user.name || 'Admin', created_at: new Date().toISOString(),
    });
    return json({ imported: docs.length, errors });
  }

  // Attendance summary report - per student monthly %
  if (resource === 'reports' && id === 'attendance-summary' && method === 'GET') {
    const scope = orgScope(user);
    const students = await db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray();
    const attendance = await db.collection('attendance').find(scope).toArray();
    // Group attendance by student+month
    const summary = students.map(s => {
      const sRecs = attendance.filter(a => a.student_id === s.id);
      const months = {};
      sRecs.forEach(a => {
        const key = a.date.slice(0, 7); // YYYY-MM
        if (!months[key]) months[key] = { present: 0, total: 0 };
        months[key].total++;
        if (a.status === 'present' || a.status === 'late') months[key].present++;
      });
      const monthly = Object.fromEntries(Object.entries(months).map(([k, v]) => [k, v.total ? Math.round((v.present / v.total) * 100) : 0]));
      const totalPresent = sRecs.filter(a => a.status === 'present' || a.status === 'late').length;
      const overall = sRecs.length ? Math.round((totalPresent / sRecs.length) * 100) : 0;
      return {
        student_id: s.student_id,
        name: `${s.first_name} ${s.last_name}`,
        overall,
        monthly,
        total_sessions: sRecs.length,
        present: totalPresent,
      };
    });
    // Collect all months in dataset
    const allMonths = Array.from(new Set(attendance.map(a => a.date.slice(0, 7)))).sort();
    return json({ months: allMonths, students: summary });
  }


  // Versioned backup/restore for every non-system collection.
  const BACKUP_VERSION = '2.0';
  const BACKUP_EXCLUDED_COLLECTIONS = new Set(['system.profile', 'system.users', 'system.js']);
  async function listBackupCollections() {
    const names = await db.listCollections({}, { nameOnly: true }).toArray();
    return names.map(x => x.name).filter(name => !name.startsWith('system.') && !BACKUP_EXCLUDED_COLLECTIONS.has(name)).sort();
  }
  function backupDocument(doc, includeSecrets = false) {
    const { _id, ...rest } = doc || {};
    if (!includeSecrets) delete rest.password_hash;
    return rest;
  }
  function validateBackupPayload(body) {
    if (!body || body.format !== 'gokulam360-backup' || body.version !== BACKUP_VERSION) return 'Unsupported backup format or version';
    if (!body.data || typeof body.data !== 'object') return 'Backup data is missing';
    if (!Array.isArray(body.collections) || body.collections.some(name => typeof name !== 'string' || name.startsWith('system.'))) return 'Invalid collection manifest';
    for (const [name, docs] of Object.entries(body.data)) if (!Array.isArray(docs)) return `Collection ${name} must be an array`;
    return null;
  }
  if (resource === 'backup' && id === 'export' && method === 'GET') {
    if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const names = await listBackupCollections();
    const fullSystem = user.role === 'super_admin';
    const data = {};
    for (const name of names) {
      const filter = fullSystem ? {} : { organization_id: user.organization_id };
      data[name] = (await db.collection(name).find(filter).toArray()).map(doc => backupDocument(doc, fullSystem));
    }
    const counts = Object.fromEntries(Object.entries(data).map(([name, docs]) => [name, docs.length]));
    return json({ format: 'gokulam360-backup', version: BACKUP_VERSION, exported_at: new Date().toISOString(), exported_by: user.email, scope: fullSystem ? 'system' : 'organization', organization_id: fullSystem ? null : user.organization_id, collections: names, counts, data });
  }
  if (resource === 'backup' && id === 'restore' && method === 'POST') {
    if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const validationError = validateBackupPayload(body);
    if (validationError) return json({ error: validationError }, 422);
    const fullSystem = body.scope === 'system';
    if (fullSystem && user.role !== 'super_admin') return json({ error: 'Only Super Admin can restore a system backup' }, 403);
    if (!fullSystem && body.organization_id !== user.organization_id) return json({ error: 'Backup belongs to a different organization' }, 403);
    const names = body.collections.filter(name => !BACKUP_EXCLUDED_COLLECTIONS.has(name));
    const session = cachedClient.startSession();
    const counts = {};
    try {
      await session.withTransaction(async () => {
        for (const name of names) {
          const docs = body.data[name] || [];
          const filter = fullSystem ? {} : { organization_id: user.organization_id };
          await db.collection(name).deleteMany(filter, { session });
          const normalized = docs.map(doc => ({ ...doc, id: doc.id || uuidv4(), ...(fullSystem ? {} : { organization_id: user.organization_id }) }));
          if (normalized.length) await db.collection(name).insertMany(normalized, { session });
          counts[name] = normalized.length;
        }
        await db.collection('activity').insertOne({ id: uuidv4(), ...(fullSystem ? {} : { organization_id: user.organization_id }), kind: 'backup_restored', title: 'Backup restored', actor: user.name || user.email, created_at: new Date().toISOString() }, { session });
      });
    } catch (error) {
      console.error('Backup restore transaction failed', error);
      return json({ error: 'Restore failed; no changes were committed' }, 422);
    } finally {
      await session.endSession();
    }
    return json({ restored: counts, atomic: true });
  }

  // Cancel, restore, or postpone a session
  if (resource === 'programs' && id && sub === 'cancel-session' && method === 'POST') {
    if (!['org_admin', 'super_admin', 'teacher'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json(); // { date, new_date?, reason?, action: 'cancel'|'restore'|'postpone' }
    const prog = await db.collection('programs').findOne({ id, ...orgScope(user) });
    if (!prog) return json({ error: 'Not found' }, 404);
    const cancelled = new Set(prog.cancelled_dates || []);
    const postponed = { ...(prog.postponed_dates || {}) };
    const cancellationReasons = { ...(prog.cancellation_reasons || {}) };
    const postponementReasons = { ...(prog.postponement_reasons || {}) };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return json({ error: 'A valid session date is required' }, 422);
    if (body.action === 'cancel' && !String(body.reason || '').trim()) return json({ error: 'A cancellation reason is required' }, 422);
    if (body.action === 'postpone') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.new_date || '')) return json({ error: 'A valid new session date is required' }, 422);
      if (!String(body.reason || '').trim()) return json({ error: 'A postponement reason is required' }, 422);
      if (body.date === body.new_date) return json({ error: 'Choose a different date for postponement' }, 422);
      postponed[body.date] = body.new_date;
      postponementReasons[body.date] = String(body.reason).trim();
      cancelled.delete(body.date);
    } else if (body.action === 'restore') {
      cancelled.delete(body.date);
      delete cancellationReasons[body.date];
      delete postponed[body.date];
      delete postponementReasons[body.date];
    } else {
      cancelled.add(body.date);
      cancellationReasons[body.date] = String(body.reason).trim();
      delete postponed[body.date];
      delete postponementReasons[body.date];
    }

    const updated = { cancelled_dates: [...cancelled], cancellation_reasons: cancellationReasons, postponed_dates: postponed, postponement_reasons: postponementReasons };
    updated.sessions = generateSessions({ ...prog, ...updated });
    await db.collection('programs').updateOne({ id }, { $set: updated });
    return json({ ok: true, cancelled_dates: updated.cancelled_dates, postponed_dates: updated.postponed_dates });
  }

  return json({ error: 'Not found', path: url.pathname, method }, 404);
}

export async function GET(req) { try { return await router(req, 'GET'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function POST(req) { try { return await router(req, 'POST'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function PUT(req) { try { return await router(req, 'PUT'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function DELETE(req) { try { return await router(req, 'DELETE'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function PATCH(req) { try { return await router(req, 'PUT'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }

