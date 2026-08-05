# ADR-005: Preserve Business History Through Lifecycles and Reversals

**Status:** Accepted

## Problem

Hard deletion and in-place edits invalidate reports, audit trails, and financial history.

## Alternatives

1. Hard delete records.
2. Generic soft delete for all records.
3. Entity lifecycle states plus immutable events, reversals, and archival.

## Decision

Memberships never have a Deleted state. Business entities retain lifecycle history. Financial, credit, attendance, and audit records are immutable; corrections create compensating records.

## Consequences

Historical reporting stays reliable. The platform requires explicit correction UX and careful data-retention policies, but gains auditability.
