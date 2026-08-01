# ADR-013: Attendance and Session Status Semantics

- Status: Accepted
- Date: 2026-07-31
- Scope: PR #22A — Attendance Domain Foundation

## Context

Attendance must be recorded against canonical Sessions and Membership Term Participations. The legacy Attendance flow overwrites records by program and date, which cannot preserve corrections or support transactional credit consumption.

## Decision

Attendance is a canonical, organization-scoped transactional domain. Each Attendance Record references exactly one Session and one active Membership Term Participation. Attendance records are append-only. A correction or void is represented by a new record linked to the prior record through `supersedes_record_id`; the original record is never edited or deleted.

The canonical API enum values are lowercase:

| Business status | API value | Credit effect |
|---|---|---|
| Present | `present` | Debit configured credits when the offering policy enables consumption |
| Late | `late` | Debit configured credits when the offering policy enables consumption |
| Absent | `absent` | No debit |
| Excused | `excused` | No debit |

Canonical Session statuses are:

| Session status | API value | Attendance/credit rule |
|---|---|---|
| Scheduled | `scheduled` | Attendance may be recorded |
| Completed | `completed` | Attendance may be recorded |
| Holiday | `holiday` | No Attendance Record; never debits |
| Cancelled | `cancelled` | No Attendance Record; never debits |

The existing Academic Calendar also supports `rescheduled` and `archived` lifecycle values. They do not change the Attendance debit rule; only Holiday and Cancelled prohibit a new Attendance Record.

Credit consumption is enabled only when the selected Program Offering explicitly contains an attendance policy with `credit_consumption_enabled: true` and a positive integer `credits_per_attendance`. If the policy is absent, consumption is disabled. Present and Late use the configured quantity; Absent and Excused use zero. A zero or negative Membership balance never blocks Attendance.

Attendance writes, any compensating Credit Ledger entry, Audit Log, Outbox Event, and idempotency receipt are committed in one MongoDB transaction. If the transaction fails, none of those writes remain.

## Alternatives considered

1. Continue using the legacy date/program bulk replacement — rejected because it loses history and is not tied to canonical Participation.
2. Mutate one Attendance row in place — rejected because corrections would destroy business history.
3. Introduce a separate balance or attendance counter — rejected because the Credit Ledger remains the single source of credit truth.
4. Introduce a new Credit Policy bounded context in this PR — deferred; the offering policy shape is a small compatibility point until the approved Credit Policy module exists.

## Consequences

- PR #22A provides canonical APIs and domain services without changing the legacy Attendance UI or writing to legacy collections.
- PR #22B can replace the legacy UI with a Session-based roster without changing this data model.
- Corrections are more auditable and require idempotency keys.
- MongoDB transaction-capable infrastructure is required for production verification.
