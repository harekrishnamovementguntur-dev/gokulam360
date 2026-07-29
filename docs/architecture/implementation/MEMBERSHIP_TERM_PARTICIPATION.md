# Membership Term Participation — PR #16

## Purpose

Membership Term Participation connects a durable Membership to a specific Program Offering and Term. It is the relationship future Attendance, Credits, and Reporting will reference.

## Workflow

Student → Active Membership → Program Offering → Term → Active Participation

The administrator UI filters each selection so that the Program Offering belongs to the Membership's Program and the Term belongs to the selected Offering.

## Lifecycle

- Active
- Completed
- Withdrawn
- Archived

Archived records are retained. Lifecycle transitions create history, audit records, and transactional outbox events. Participation references are immutable after creation.

## APIs

- GET/POST /api/membership-term-participations
- GET /api/membership-term-participations/:id
- POST /api/membership-term-participations/:id/lifecycle

Filters include Membership, Student, Program Offering, Term, and Status.

## Validation

- Membership must exist, be Active, and belong to the current Organization.
- Program Offering must exist, be non-archived, and belong to the Membership's Program.
- Term must exist, be non-archived, and belong to the selected Program Offering.
- Only one Active Participation may exist for the same Membership and Term.

## Out of scope

Attendance, Credits, Payments, Parent Dashboard changes, Notifications, Reports, and Certificates.


## Development verification fixture

Preview and local development environments expose an authenticated, idempotent fixture endpoint:

- `POST /api/dev-fixtures/membership-term-participation`
- Available only when `VERCEL_ENV=preview`, `ENABLE_DEV_FIXTURES=true`, or local development is active.
- Restricted to `super_admin` and `org_admin`.
- Creates or reuses one Student, Active Membership, canonical Program, Program Offering, and Term in the authenticated Organization.
- Uses the existing Membership, Program, Offering, and Term constructors/services where applicable; it does not weaken Participation validation.
- Fixture records use a `pr16-fixture` identifier prefix and are safe to call repeatedly.
- The legacy Program record created only for a fresh fixture exists to satisfy the current development shell's Membership API; it is explicitly test data and is not a production migration mechanism.
