Exit code: 0
Wall time: 0.8 seconds
Total output lines: 1015
Output:
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

async function requireAuth(req, roles = null) {
  const user = verifyToken(req);
  if (!user) return { error: json({ error: 'Unauthorized' }, 401) };
  if (roles && !roles.includes(user.role)) {
    return { error: json({ error: 'Forbidden' }, 403) };
  }
  return { user };
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
  const sessions = [];
  const start = new Date(program.start_date + 'T00:00:00');
  const end = new Date(program.end_date + 'T00:00:00');
  const cur = new Date(start);
  while (cur <= end) {
    if (days.includes(cur.getDay())) {
      const d = cur.toISOString().slice(0, 10);
      if (!cancelled.has(d)) sessions.push(d);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return sessions;
}

async function syncEnrollments(db, student, oldProgramIds = []) {
  const orgId = student.organization_id;
  const newIds = student.program_ids || [];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const added = newIds.filter(id => !oldProgramIds.includes(id));
  const removed = oldProgramIds.filter(id => !newIds.includes(id));
  for (const pid of added) {
    const existing = await db.collection('enrollments').findOne({ student_id: student.id, program_id: pid, left_at: null });
    if (existing) continue;
    const prog = await db.collection('programs').findOne({ id: pid });
    const allSessions = prog?.sessions || [];
    // sessions_credited = remaining sessions of this class from today forward
    const remainingFromToday = allSessions.filter(d => d >= today);
    const credited = remainingFromToday.length || allSessions.length;
    await db.collection('enrollments').insertOne({
      id: uuidv4(), organization_id: orgId, student_id: student.id, program_id: pid,
      enrolled_at: now, left_at: null, status: 'active',
      sessions_credited: credited,
      created_at: now,
    });
    if (prog?.fee_amount) {
      await db.collection('fees').insertOne({
        id: uuidv4(), organization_id: orgId, student_id: student.id, program_id: pid,
        fee_type: 'Term Fee', amount: prog.fee_amount, paid_amount: 0, status: 'pending',
        due_date: prog.start_date || today, created_at: now,
      });
    }
  }
  for (const pid of removed) {
    await db.collection('enrollments').updateMany(
      { student_id: student.id, program_id: pid, left_at: null },
      { $set: { left_at: now, status: 'left' } }
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
  const [resource, id, sub] = parts;
  const db = await getDb();

  // ---- public ----
  if (resource === 'health') return json({ ok: true, service: 'gokulam360' });

  // PUBLIC parent link â€” no auth required
  if (resource === 'public' && id === 'student' && sub && method === 'GET') {
    const student = await db.collection('students').findOne({ public_token: sub });
    if (!student) return json({ error: 'Not found' }, 404);
    const org = await db.collection('organizations').findOne({ id: student.organization_id });
    const enrollments = await db.collection('enrollments').find({ student_id: student.id }).sort({ enrolled_at: -1 }).toArray();
    const programs = await db.collection('programs').find({ id: { $in: enrollments.map(e => e.program_id) } }).toArray();
    const pMap = Object.fromEntries(programs.map(p => [p.id, p]));
    const att = await db.collection('attendance').find({ student_id: student.id }).sort({ date: -1 }).toArray();
    const fees = await db.collection('fees').find({ student_id: student.id }).toArray();
    const today = new Date().toISOString().slice(0, 10);
    const events = await db.collection('events')
      .find({ organization_id: student.organization_id, date: { $gte: today } })
      .sort({ date: 1 })
      .limit(6)
      .toArray();
    const enrichedEnr = enrollments.map(e => {
      const attended = att.filter(a => a.program_id === e.program_id && (a.status === 'present' || a.status === 'late') && a.date >= (e.enrolled_at || '').slice(0, 10)).length;
      const credited = e.sessions_credited || 0;
      return { ...stripId(e), program_name: pMap[e.program_id]?.name || '-', sessions_attended: attended, sessions_remaining: Math.max(0, credited - attended) };
    });
    return json({
      student: { id: student.id, student_id: student.student_id, first_name: student.first_name, last_name: student.last_name, photo_url: student.photo_url, dob: student.dob, program_id: student.program_id },
      organization: { name: org?.name, logo_url: org?.logo_url, contact_email: org?.contact_email, contact_phone: org?.contact_phone },
      enrollments: enrichedEnr,
      attendance: att.slice(0, 20).map(stripId),
      fees: fees.map(stripId),
      events: events.map(stripId),
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
      return json({ user: u, organization: org ? str…2793 tokens truncated…hed = sessions.map(d => ({
      date: d, day_name: new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'long' }),
      marked: !!byDate[d], present: byDate[d]?.present || 0, total: byDate[d]?.total || 0,
      is_past: new Date(d) < new Date().setHours(0, 0, 0, 0),
      is_today: d === new Date().toISOString().slice(0, 10),
    }));
    return json({ program_id: id, program_name: prog.name, days_of_week: prog.days_of_week, sessions: enriched });
  }

  // Bulk attendance
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
    if (type === 'students') {
      const items = await db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray();
      return json({ items: items.map(stripId) });
    }
    if (type === 'attendance') {
      const items = await db.collection('attendance').find(scope).sort({ date: -1 }).toArray();
      const students = await db.collection('students').find(scope).toArray();
      const sMap = Object.fromEntries(students.map(s => [s.id, `${s.first_name} ${s.last_name}`]));
      return json({ items: items.map(a => ({ ...stripId(a), student_name: sMap[a.student_id] || '-' })) });
    }
    if (type === 'fees') {
      const items = await db.collection('fees').find(scope).toArray();
      const students = await db.collection('students').find(scope).toArray();
      const sMap = Object.fromEntries(students.map(s => [s.id, `${s.first_name} ${s.last_name}`]));
      return json({ items: items.map(f => ({ ...stripId(f), student_name: sMap[f.student_id] || '-' })) });
    }
    if (type === 'attendance-summary') {
      const students = await db.collection('students').find({ ...scope, is_deleted: { $ne: true } }).toArray();
      const attendance = await db.collection('attendance').find(scope).toArray();
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

  // Backup export - entire org data as JSON
  if (resource === 'backup' && id === 'export' && method === 'GET') {
    if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const scope = { organization_id: user.organization_id };
    const [organizations, students, teachers, programs, attendance, fees, events, notifications, activity] = await Promise.all([
      user.role === 'super_admin' ? db.collection('organizations').find({}).toArray() : db.collection('organizations').find({ id: user.organization_id }).toArray(),
      db.collection('students').find(scope).toArray(),
      db.collection('teachers').find(scope).toArray(),
      db.collection('programs').find(scope).toArray(),
      db.collection('attendance').find(scope).toArray(),
      db.collection('fees').find(scope).toArray(),
      db.collection('events').find(scope).toArray(),
      db.collection('notifications').find(scope).toArray(),
      db.collection('activity').find(scope).toArray(),
    ]);
    return json({
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      organization_id: user.organization_id,
      version: '1.0',
      counts: { students: students.length, teachers: teachers.length, programs: programs.length, attendance: attendance.length, fees: fees.length, events: events.length, notifications: notifications.length },
      data: {
        organizations: organizations.map(stripId),
        students: students.map(stripId),
        teachers: teachers.map(stripId),
        programs: programs.map(stripId),
        attendance: attendance.map(stripId),
        fees: fees.map(stripId),
        events: events.map(stripId),
        notifications: notifications.map(stripId),
        activity: activity.map(stripId),
      },
    });
  }

  // Backup restore - accept JSON, replaces the org's data
  if (resource === 'backup' && id === 'restore' && method === 'POST') {
    if (!['org_admin', 'super_admin'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json();
    const data = body.data || {};
    const orgId = user.organization_id;
    const collections = ['students', 'teachers', 'programs', 'attendance', 'fees', 'events', 'notifications'];
    const counts = {};
    for (const c of collections) {
      const items = (data[c] || []).map(x => ({ ...x, organization_id: orgId, id: x.id || uuidv4() }));
      // Wipe org's existing data in this collection
      await db.collection(c).deleteMany({ organization_id: orgId });
      if (items.length) await db.collection(c).insertMany(items);
      counts[c] = items.length;
    }
    await db.collection('activity').insertOne({
      id: uuidv4(), organization_id: orgId, kind: 'backup_restored',
      title: `Data restored from backup: ${Object.values(counts).reduce((a, b) => a + b, 0)} records`,
      actor: user.name || 'Admin', created_at: new Date().toISOString(),
    });
    return json({ restored: counts });
  }

  // Cancel or restore a session
  if (resource === 'programs' && id && sub === 'cancel-session' && method === 'POST') {
    if (!['org_admin', 'super_admin', 'teacher'].includes(user.role)) return json({ error: 'Forbidden' }, 403);
    const body = await req.json(); // { date, reason?, action: 'cancel'|'restore' }
    const prog = await db.collection('programs').findOne({ id, ...orgScope(user) });
    if (!prog) return json({ error: 'Not found' }, 404);
    const cancelled = new Set(prog.cancelled_dates || []);
    if (body.action === 'restore') cancelled.delete(body.date);
    else cancelled.add(body.date);
    const updated = { cancelled_dates: [...cancelled] };
    updated.sessions = generateSessions({ ...prog, cancelled_dates: updated.cancelled_dates });
    await db.collection('programs').updateOne({ id }, { $set: updated });
    return json({ ok: true, cancelled_dates: updated.cancelled_dates });
  }

  return json({ error: 'Not found', path: url.pathname, method }, 404);
}

export async function GET(req) { try { return await router(req, 'GET'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function POST(req) { try { return await router(req, 'POST'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function PUT(req) { try { return await router(req, 'PUT'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function DELETE(req) { try { return await router(req, 'DELETE'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }
export async function PATCH(req) { try { return await router(req, 'PUT'); } catch (e) { console.error(e); return json({ error: e.message }, 500); } }

