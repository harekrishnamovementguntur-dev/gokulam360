# Gokulam360 Implementation Roadmap

This roadmap governs implementation after Architecture Gita v1.0. Canonical domains are built first; application consumers are cut over only after the required canonical foundations are complete.

## Status

| Phase | Scope | Status |
|---|---|---|
| PR #13 | Membership foundation and UI | Completed / merged |
| PR #14 | Program and Program Offering | Completed / merged |
| PR #15 | Terms and Sessions | Completed / merged |
| PR #16 | Membership Term Participation | Completed / merged |
| PR #17A | Credit Ledger Foundation | Completed / merged |
| PR #17B / #18 | Payment Processing and Allocations | Completed / merged |
| PR #20 | Audit index initialization fix | Completed / merged |
| PR #22A | Attendance Domain Foundation | In progress |
| PR #22B | Attendance Administrator UI and canonical roster workflow | In progress |
| PR #23 | Coordinated Application Cutover | Planned |
| PR #24 | Legacy Removal and Cleanup | Planned |\n| PR #29 | Reporting Reconciliation (Members, Memberships, Payments, Credit Ledger) | In progress |

## Completed capabilities

### PR #14 — Program and Program Offering

- Canonical Program definitions are separate from operational Program Offerings.
- Organization-scoped persistence, validation, lifecycle history, audit records, and outbox events.
- Administrator UI for Program and Offering management.
- No migration framework, synchronization, or dual writes.

### PR #15 — Academic Calendar

- First-class Terms beneath Program Offerings.
- First-class Sessions beneath Terms.
- Configurable, repeatable, idempotent Session generation with preview.
- Preservation of manually modified, cancelled, rescheduled, and archived Sessions.
- Term and Session lifecycle management, audit logging, and outbox integration.

### PR #16 — Membership Term Participation

- First-class relationship between Membership, Program Offering, and Term.
- Participation lifecycle management with audit history.
- Validation of active Memberships and matching Offering/Term relationships.
- Duplicate active Participation prevention and organization-scoped APIs/UI.

### PR #17A — Credit Ledger Foundation

- Append-only Credit Ledger entries with structured reasons, descriptions, and source references.
- Calculated balances and running balances with no persisted mutable balance.
- Idempotent manual adjustment command with organization scoping.
- Atomic ledger, audit, outbox, and idempotency receipt writes.

### PR #17B / #18 — Payment Processing and Allocations

- Separate Payment Transactions and Payment Allocations.
- Payment posting is distinct from creation; credits are granted only when posted.
- Immutable posted allocations with compensating corrections.
- Idempotent posting, audit logs, and Transactional Outbox events.

## PR #22A — Attendance Domain Foundation

This phase introduces the canonical transactional Attendance domain:

- Attendance Records reference canonical Sessions and active Membership Term Participations.
- Attendance statuses are Present, Late, Absent, and Excused.
- Attendance records are append-only; corrections and voids create linked revisions.
- Present/Late credit consumption uses the configured offering policy; Absent/Excused do not debit.
- Holiday and Cancelled Sessions never debit and cannot receive a new Attendance Record.
- Attendance, compensating Ledger entries, Audit Logs, Outbox Events, and idempotency receipts are written transactionally.
- Legacy Attendance UI and legacy collections remain unchanged until coordinated cutover.

### PR #22B — Attendance Administrator UI

- Canonical administrator workflow selects Program Offering, Term, and Session.
- Active Membership Term Participations are displayed as the session roster.
- Attendance writes use only the canonical Attendance API with idempotency keys.
- Existing records and immutable correction history are displayed; Holiday and Cancelled Sessions are blocked.
- Legacy Attendance endpoints and collections are not used.

### PR #27 — Canonical Attendance Reports

- Canonical Attendance record report with status breakdowns and organization-scoped cursor pagination.
- Session attendance summaries sourced from canonical Sessions and Attendance Records.
- Current-page CSV export using the shared reporting contract.
- No dashboards, analytics, notifications, legacy collection reads, or mutation behavior.

## Governance

- Architecture Gita, ADRs, Business Rules, and Glossary govern all implementation.
- The development shell is temporary and must not receive new business capabilities.
- No migration framework, synchronization, or dual writes are introduced.
- Business history is preserved through immutable records, revisions, compensating transactions, and audit events.
- Each completed PR updates this document with delivered capabilities, remaining risks, and the next dependency.

## Current remaining work

Complete Attendance domain verification and merge PR #22A, complete the administrator UI in PR #22B, then implement canonical Attendance Reports in PR #27. After the canonical Attendance workflow is complete, perform the coordinated application cutover and remove obsolete legacy consumers.


### PR #29 — Reporting Reconciliation

- Restores the approved Members/Memberships and Payment/Credit Ledger reporting services, UI components, tests, documentation, and route wiring into the current `main` baseline.
- Preserves the canonical Attendance reporting implementation and the Reporting Foundation.
- Dashboard implementation remains blocked until this reconciliation is merged.
