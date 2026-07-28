# ADR-001: Membership Is the Central Aggregate

**Status:** Accepted

## Problem

Student-to-term or student-to-batch records lose continuity when terms, years, or cohorts change.

## Alternatives

1. Attach students directly to terms.
2. Attach students directly to offerings only.
3. Use durable Membership plus time-bound Membership Term Participation.

## Decision

Use Membership as the durable Student-to-Program relationship. Use Membership Term Participation for each offering and term.

## Consequences

Membership history, credits, payments, achievements, and long-term progress remain stable. Term and batch changes become new participation records rather than destructive edits.
