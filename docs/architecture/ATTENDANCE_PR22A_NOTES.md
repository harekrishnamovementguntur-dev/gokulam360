# PR #22A — Attendance Domain Foundation Notes

## API contract

- `GET /api/attendance-records` lists organization-scoped canonical records.
- `POST /api/attendance-records` records an initial Attendance Record.
- `GET /api/attendance-records/:id` retrieves one record.
- `POST /api/attendance-records/:id/correction` appends a corrected revision.
- `POST /api/attendance-records/:id/void` appends a void revision.
- All mutations require an `Idempotency-Key` header.
- Super administrators must provide `organization_id`; organization users are always scoped to their authenticated organization.

## Migration notes

This PR intentionally does not modify the legacy Attendance UI, legacy `attendance` collection, legacy `/attendance-bulk` route, Students, Enrollments, or Parent Portal. There are no dual writes. PR #22B will provide the canonical administrator roster UI; the coordinated cutover will move application consumers only after the canonical workflow is verified.

## Transaction and audit behavior

An Attendance mutation and its non-zero compensating Credit Ledger entry are committed together with the Audit Log, Outbox Event, and idempotency receipt. A failed transaction must leave none of those writes visible. Corrections never edit the prior record.

## Architect's notes

- Credit consumption currently reads an explicit `attendance_policy` from the Program Offering (or its metadata), because the dedicated configurable Credit Policy module is not yet a completed bounded context.
- Attendance is intentionally independent of balance availability. Negative balances are valid and do not prevent recording.
- Teacher assignment and UI roster ergonomics remain outside this foundation PR.
