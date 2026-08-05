# Academic Calendar Migration Readiness — PR #15

## Covered

- Canonical Terms beneath Program Offerings.
- Canonical Sessions beneath Terms.
- Server-assigned immutable Session numbers.
- Preview-first, additive Session generation.
- Excluded dates and holiday reasons.
- Generated versus manual Session ownership.
- Term and Session lifecycle history.
- Organization-scoped indexes, audit records, and outbox events.
- Administrator UI for Term and Session management.

## Not covered

- Legacy Classes migration.
- Attendance.
- Membership Term Participation.
- Credits and Payments.
- Notifications and reporting consumers.

## Risks

- The existing application shell still uses legacy scheduling screens until coordinated cutover.
- MongoDB transactions require the deployment database to support transactions.
- Session numbers are immutable; inserting a missing historical date later receives the next available number rather than renumbering history.

## Technical debt

- Teacher assignment is intentionally deferred to a future relationship.
- Generation history is stored and auditable but does not yet have a dedicated reporting screen.

## Recommended PR #16

Implement Membership Term Participation against canonical Program Offerings and Terms. Do not couple Attendance or Credits to the new Session records until the participation relationship is established.
