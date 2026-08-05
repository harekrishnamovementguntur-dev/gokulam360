# PR #27 — Canonical Attendance Reports

## Scope

This bounded context adds read-only Attendance reporting over canonical collections only:

- `attendance_records`
- `academic_sessions`
- `membership_term_participations`
- `memberships`
- `students`

The legacy `attendance` collection and legacy reporting endpoints are not read.

## API contracts

- `GET /api/reports/attendance` — paginated Attendance records with status breakdown.
- `GET /api/reports/attendance-summary` — session-level status summaries.
- `GET /api/reports/attendance/export` — current-page CSV export.

All routes derive organization scope from the authenticated user. Client-supplied `organization_id` is rejected by the shared reporting filter parser.

## Filters and pagination

Supported shared filters include date range, Program Offering, Term, Session, Membership, Student, status, page size, sort, direction, and cursor. Attendance status is restricted to Present, Late, Absent, and Excused.

Attendance records are sorted by `recorded_at` with an immutable ID tie-breaker. The session summary uses canonical Session dates and returns the same cursor contract.

## Business semantics

- Reports are read-only.
- Corrections remain visible as immutable records.
- Credit Ledger, Audit, and Outbox data are not reinterpreted by this PR.
- No dashboard, analytics, notification, or migration behavior is introduced.

## Index/performance notes

The Attendance domain supplies organization and timeline indexes for Attendance records. Report queries use organization as their first predicate. Current-page CSV exports reuse the paginated Attendance query and never load unbounded CSV pages.
