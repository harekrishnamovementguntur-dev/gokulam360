export function summarizeStudentCredits(memberships = [], entries = []) {
  const membershipToStudent = new Map();
  const summary = new Map();

  for (const membership of memberships) {
    if (!membership?.id || !membership?.student_id) continue;
    membershipToStudent.set(membership.id, membership.student_id);
    summary.set(membership.student_id, { granted: 0, remaining: 0 });
  }

  for (const entry of entries) {
    const studentId = membershipToStudent.get(entry?.membership_id);
    if (!studentId) continue;
    const delta = Number(entry.quantity_delta) || 0;
    const current = summary.get(studentId) || { granted: 0, remaining: 0 };
    current.remaining += delta;
    if (delta > 0) current.granted += delta;
    summary.set(studentId, current);
  }

  return summary;
}
