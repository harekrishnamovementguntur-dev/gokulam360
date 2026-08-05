import { ReportingError } from './reporting-domain.mjs';

export const ATTENDANCE_REPORT_STATUSES = Object.freeze(['present', 'late', 'absent', 'excused']);

export function normalizeAttendanceFilters(filters = {}) {
  const status = filters.status ? String(filters.status).trim().toLowerCase() : null;
  if (status && !ATTENDANCE_REPORT_STATUSES.includes(status)) {
    throw new ReportingError('status must be present, late, absent, or excused', 400, 'invalid_attendance_status');
  }
  return { ...filters, status, sort: filters.sort === 'created_at' ? 'recorded_at' : filters.sort };
}

export function attendanceCounts(items = []) {
  const counts = Object.fromEntries(ATTENDANCE_REPORT_STATUSES.map((status) => [status, 0]));
  for (const item of items) if (Object.hasOwn(counts, item.status)) counts[item.status] += 1;
  return { ...counts, total: ATTENDANCE_REPORT_STATUSES.reduce((sum, status) => sum + counts[status], 0) };
}

export function sessionSummaryCounts(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const key = record.session_id;
    if (!grouped.has(key)) grouped.set(key, { session_id: key, ...attendanceCounts([]) });
    const summary = grouped.get(key);
    if (Object.hasOwn(summary, record.status)) summary[record.status] += 1;
    summary.total += 1;
  }
  return [...grouped.values()];
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export function attendanceCsv(items = []) {
  const columns = [
    'attendance_id',
    'session_id',
    'session_date',
    'session_status',
    'membership_term_participation_id',
    'membership_id',
    'student_id',
    'student_name',
    'program_offering_id',
    'term_id',
    'status',
    'event_type',
    'revision',
    'recorded_at',
    'notes',
  ];
  const lines = [columns.join(',')];
  for (const item of items) {
    lines.push([
      item.id,
      item.session_id,
      item.session_date,
      item.session_status,
      item.membership_term_participation_id,
      item.membership_id,
      item.student_id,
      item.student_name,
      item.program_offering_id,
      item.term_id,
      item.status,
      item.event_type,
      item.revision,
      item.recorded_at,
      item.notes,
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
