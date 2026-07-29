# ADR-010: Membership Term Participation as a First-Class Entity

- Status: Proposed for PR #16
- Date: 2026-07-29

## Problem

Memberships are durable Student-to-Program relationships, while Terms are time-bounded academic periods beneath Program Offerings. Attendance and future progress must identify the exact academic participation without changing Membership when a student changes Term, Offering, or academic year.

## Alternatives considered

1. Embed Term participation inside Membership.
2. Add mutable term fields directly to Membership.
3. Create a first-class Membership Term Participation entity.

## Decision

Use a first-class, organization-scoped membership_term_participations collection. Each Participation references exactly one Membership, Program Offering, and Term. References are immutable after creation. Lifecycle changes are append-only history plus audit and outbox records.

A Participation may be created only for an Active Membership, and the Offering must belong to the Membership's Program. A partial unique index allows only one Active Participation for a Membership and Term while retaining archived historical records.

## Consequences

- Attendance can reference Participation rather than Membership directly.
- Membership remains durable across Terms and Offerings.
- Invalid academic relationships are rejected at the service boundary.
- Correcting a relationship requires archival and a new Participation.
- Future Attendance, Credits, and Reporting can use a stable Participation identifier.
