# Attendance Legacy Isolation

## Scope

This document records the Attendance legacy isolation workstream. Canonical Attendance remains the only supported mutation model.

## Changes

- The legacy `POST /api/attendance-bulk` handler is no longer registered.
- Development seeding no longer creates records in the legacy `attendance` collection.
- Backup restore rejects legacy attendance payloads instead of writing them.
- Dashboard attendance statistics read canonical `attendance_records`.
- Canonical administrator Attendance UI, Attendance APIs, and Attendance reports remain unchanged.
- Legacy parent, public-student, enrollment, and program-session consumers still expose read-only legacy attendance views where they cannot be migrated without broader consumer work. They are explicitly isolated: this workstream adds no writes, synchronization, or dual writes.

## Verification Matrix

| Scenario | Status | Evidence |
|---|---|---|
| Legacy `/api/attendance-bulk` mutation route | Verified by source/test | No catch-all route registration remains. |
| Legacy attendance writes in catch-all | Verified by source/test | No insert, update, replace, or delete operation targets `attendance`. |
| Canonical Attendance UI/API behavior | Preserved | No canonical Attendance domain files were changed. |
| Canonical Attendance reports | Preserved | No reporting files were changed. |
| Dashboard attendance source | Verified by source | Dashboard statistics query `attendance_records`. |
| Legacy parent/public/enrollment reads | Intentionally isolated | Migration requires broader Membership/Participation and Parent/Dashboard work. |
| Organization isolation | Deferred runtime verification | Requires authenticated deployment/database access. |
| Transaction/audit/outbox behavior | Deferred runtime verification | Canonical Attendance implementation is unchanged; requires transaction-capable runtime verification. |

## Rollback Strategy

If a regression is found, revert this PR. The canonical Attendance domain and routes are untouched, so rollback restores the prior legacy read behavior without data migration or dual-write cleanup.

## Follow-up

The remaining legacy read consumers should be migrated independently when their owning workstreams are scheduled. No new legacy Attendance writes should be introduced.
