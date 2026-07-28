# Membership Domain — Implementation Notes

## Scope

This first implementation phase introduces durable Membership records, lifecycle history, audit records, pending outbox events, and a Membership Management UI. It does not change legacy Student, Program, Enrollment, Fee, Attendance, or parent-portal behaviour.

## UI capability

Administrators can list, search, filter, create, view, edit Membership notes, archive, and restore Memberships. Student and Program links are deliberately immutable after creation; changing either would create a different business relationship and must be represented by a new Membership. A Student and Program may have only one non-archived Membership; when a prior Membership is Completed, it is reactivated instead of creating another one.

## API

- `GET /api/memberships?student_id=&program_id=&status=`
- `POST /api/memberships`
- `GET /api/memberships/{membershipId}`
- `PUT /api/memberships/{membershipId}` — edits notes only
- `POST /api/memberships/{membershipId}/lifecycle`

Only administrators can create, edit, archive, or restore a Membership. Teachers have read-only API access.

## Migration and compatibility

The change is additive. Existing legacy `enrollments` remain untouched and there is no automatic backfill in this pull request. Backfill must wait until Program Offerings and Terms exist, because BR-022 requires a Membership Term Participation to identify both. The next phases will add migration tooling with source references and reconciliation reporting.

MongoDB transactions require a replica set or MongoDB Atlas. This is already the required production deployment mode; local standalone development must use a replica-set configuration before exercising Membership write endpoints.

## Risks

- The UI is operationally independent from current enrollment, fee, and attendance screens until their planned migrations.
- The outbox rows are recorded now to satisfy atomic business-history requirements; asynchronous delivery is implemented in the Notifications & Transactional Outbox phase.
