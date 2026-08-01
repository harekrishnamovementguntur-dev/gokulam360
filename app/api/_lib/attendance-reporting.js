import {
  cursorPredicate,
  organizationScope,
  reportResponse,
  ReportingError,
} from '../../../lib/reporting-domain.mjs';
import {
  attendanceCounts,
  attendanceCsv,
  normalizeAttendanceFilters,
  sessionSummaryCounts,
} from '../../../lib/attendance-reporting.mjs';

function rangeFilter(filters, field) {
  const result = {};
  if (filters.from) result.$gte = filters.from + 'T00:00:00.000Z';
  if (filters.to) result.$lte = filters.to + 'T23:59:59.999Z';
  return Object.keys(result).length ? { [field]: result } : {};
}

function attendanceFilter(organizationId, filters) {
  const normalized = normalizeAttendanceFilters(filters);
  const filter = { organization_id: organizationId, ...rangeFilter(normalized, 'recorded_at') };
  for (const key of ['session_id', 'membership_id', 'membership_term_participation_id', 'term_id', 'program_offering_id']) {
    if (normalized[key]) filter[key] = normalized[key];
  }
  if (normalized.status) filter.status = normalized.status;
  if (normalized.cursor) Object.assign(filter, cursorPredicate(normalized.cursor, normalized.sort, normalized.direction));
  return { filter, normalized };
}

async function relatedMaps(db, organizationId, records) {
  const sessionIds = [...new Set(records.map((item) => item.session_id).filter(Boolean))];
  const participationIds = [...new Set(records.map((item) => item.membership_term_participation_id).filter(Boolean))];
  const membershipIds = [...new Set(records.map((item) => item.membership_id).filter(Boolean))];
  const [sessions, participations, memberships] = await Promise.all([
    db.collection('academic_sessions').find({ organization_id: organizationId, id: { $in: sessionIds } }).toArray(),
    db.collection('membership_term_participations').find({ organization_id: organizationId, id: { $in: participationIds } }).toArray(),
    db.collection('memberships').find({ organization_id: organizationId, id: { $in: membershipIds } }).toArray(),
  ]);
  const studentIds = [...new Set(memberships.map((item) => item.student_id).filter(Boolean))];
  const students = await db.collection('students').find({ organization_id: organizationId, id: { $in: studentIds } }).toArray();
  return {
    sessions: new Map(sessions.map((item) => [item.id, item])),
    participations: new Map(participations.map((item) => [item.id, item])),
    memberships: new Map(memberships.map((item) => [item.id, item])),
    students: new Map(students.map((item) => [item.id, item])),
  };
}

function reportItem(record, maps) {
  const session = maps.sessions.get(record.session_id) || {};
  const participation = maps.participations.get(record.membership_term_participation_id) || {};
  const membership = maps.memberships.get(record.membership_id) || {};
  const student = maps.students.get(membership.student_id) || {};
  return {
    ...record,
    session_date: session.date || null,
    session_status: session.status || null,
    student_id: membership.student_id || null,
    student_name: student.name || student.full_name || null,
    program_offering_id: record.program_offering_id || participation.program_offering_id || null,
    term_id: record.term_id || participation.term_id || session.term_id || null,
  };
}

export async function listAttendanceReport({ db, user, filters }) {
  const organizationId = organizationScope(user).organization_id;
  const { filter, normalized } = attendanceFilter(organizationId, filters);
  const sortField = normalized.sort;
  const direction = normalized.direction === 'asc' ? 1 : -1;
  const records = await db.collection('attendance_records')
    .find(filter)
    .sort({ [sortField]: direction, id: direction })
    .limit(normalized.page_size + 1)
    .toArray();
  const hasMore = records.length > normalized.page_size;
  const pageRecords = records.slice(0, normalized.page_size);
  const maps = await relatedMaps(db, organizationId, pageRecords);
  const items = pageRecords.map((record) => reportItem(record, maps));
  const last = items.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({
      version: 1,
      value: String(last[sortField] || last.recorded_at || ''),
      id: String(last.id),
      sort: sortField,
      direction: normalized.direction,
    }), 'utf8').toString('base64url')
    : null;
  return reportResponse({
    items,
    summary: attendanceCounts(items),
    page: { page_size: normalized.page_size, next_cursor: nextCursor, has_more: hasMore },
    filters: normalized,
  });
}

export async function listSessionAttendanceSummary({ db, user, filters }) {
  const organizationId = organizationScope(user).organization_id;
  const { normalized } = attendanceFilter(organizationId, filters);
  const match = { organization_id: organizationId };
  if (normalized.session_id) match.session_id = normalized.session_id;
  if (normalized.membership_id) match.membership_id = normalized.membership_id;
  if (normalized.membership_term_participation_id) match.membership_term_participation_id = normalized.membership_term_participation_id;
  if (normalized.term_id) match.term_id = normalized.term_id;
  if (normalized.program_offering_id) match.program_offering_id = normalized.program_offering_id;
  if (normalized.status) match.status = normalized.status;
  Object.assign(match, rangeFilter(normalized, 'recorded_at'));
  const records = await db.collection('attendance_records').find(match).toArray();
  const summaries = sessionSummaryCounts(records);
  const sessionIds = summaries.map((item) => item.session_id);
  const sessions = await db.collection('academic_sessions').find({ organization_id: organizationId, id: { $in: sessionIds } }).toArray();
  const sessionMap = new Map(sessions.map((item) => [item.id, item]));
  const items = summaries
    .map((item) => ({ ...item, ...(sessionMap.get(item.session_id) ? {
      session_date: sessionMap.get(item.session_id).date,
      session_status: sessionMap.get(item.session_id).status,
      term_id: sessionMap.get(item.session_id).term_id,
    } : {}) }))
    .sort((a, b) => String(a.session_date || '').localeCompare(String(b.session_date || '')));
  const start = normalized.cursor ? items.findIndex((item) => item.session_id === normalized.cursor.id) + 1 : 0;
  const pageItems = items.slice(start, start + normalized.page_size);
  const hasMore = start + normalized.page_size < items.length;
  const last = pageItems.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ version: 1, value: String(last.session_date || ''), id: last.session_id, sort: 'date', direction: normalized.direction }), 'utf8').toString('base64url')
    : null;
  return reportResponse({
    items: pageItems,
    summary: { sessions: items.length, attendance: attendanceCounts(records) },
    page: { page_size: normalized.page_size, next_cursor: nextCursor, has_more: hasMore },
    filters: normalized,
  });
}

export { attendanceCsv };
