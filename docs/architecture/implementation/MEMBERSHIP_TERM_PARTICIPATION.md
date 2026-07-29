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
