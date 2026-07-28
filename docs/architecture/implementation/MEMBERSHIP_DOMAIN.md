# Membership Domain — Implementation Notes

## Scope

This is the first additive implementation phase of Architecture Gita v1.0. It introduces the durable `memberships` collection, lifecycle history, audit records, and pending outbox events. It does not change legacy Student, Program, Enrollment, Fee, Attendance, or UI behaviour.

## API

- `GET /api/memberships?student_id=&program_id=&status=`
- `POST /api/memberships`
- `GET /api/memberships/{membershipId}`
- `POST /api/memberships/{membershipId}/lifecycle`

Only administrators can create or transition a Membership. Teachers have read-only access.

## Migration and compatibility

The change is additive. Existing legacy `enrollments` remain untouched and there is no automatic backfill in this pull request. Backfill must wait until Program Offerings and Terms exist, because BR-022 requires a Membership Term Participation to identify both. The next phases will add migration tooling with source references and reconciliation reporting.

MongoDB transactions require a replica set or MongoDB Atlas. This is already the required production deployment mode; local standalone development must use a replica-set configuration before exercising Membership write endpoints.

## Risks

- This PR adds a new API surface but intentionally does not make it visible in the current UI.
- The outbox rows are recorded now to satisfy atomic business-history requirements; asynchronous delivery is implemented in the Notifications & Transactional Outbox phase.
