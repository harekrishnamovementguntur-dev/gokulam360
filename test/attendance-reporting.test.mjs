import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENDANCE_REPORT_STATUSES,
  attendanceCounts,
  attendanceCsv,
  normalizeAttendanceFilters,
  studentDisplayName,
  sessionSummaryCounts,
} from '../lib/attendance-reporting.mjs';

test('normalizes canonical attendance filters and rejects unknown statuses', () => {
  assert.equal(normalizeAttendanceFilters({ status: 'Present', sort: 'created_at' }).status, 'present');
  assert.equal(normalizeAttendanceFilters({ status: 'present', sort: 'created_at' }).sort, 'recorded_at');
  assert.throws(() => normalizeAttendanceFilters({ status: 'holiday' }), /status must be/);
});

test('calculates status breakdowns from canonical Attendance records', () => {
  const items = [
    { session_id: 's1', status: 'present' },
    { session_id: 's1', status: 'late' },
    { session_id: 's2', status: 'absent' },
    { session_id: 's2', status: 'excused' },
  ];
  assert.deepEqual(attendanceCounts(items), { present: 1, late: 1, absent: 1, excused: 1, total: 4 });
  assert.deepEqual(sessionSummaryCounts(items), [
    { session_id: 's1', present: 1, late: 1, absent: 0, excused: 0, total: 2 },
    { session_id: 's2', present: 0, late: 0, absent: 1, excused: 1, total: 2 },
  ]);
});

test('exports the current page as escaped CSV', () => {
  const csv = attendanceCsv([{ id: 'a1', session_id: 's1', status: 'present', student_name: 'A "Student"' }]);
  assert.match(csv, /"A ""Student"""/);
  assert.match(csv, /attendance_id,session_id/);
});

test('keeps the status contract explicit', () => {
  assert.deepEqual(ATTENDANCE_REPORT_STATUSES, ['present', 'late', 'absent', 'excused']);
});

test('prefers the canonical student first and last name in report rows', () => {
  assert.equal(studentDisplayName({ first_name: 'Radha', last_name: 'Devi' }), 'Radha Devi');
  assert.equal(studentDisplayName({ first_name: 'Radha', last_name: 'Devi', student_id: 'S-1' }), 'Radha Devi');
});
