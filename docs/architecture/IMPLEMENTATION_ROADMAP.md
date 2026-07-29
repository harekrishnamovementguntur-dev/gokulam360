# Gokulam360 Implementation Roadmap

This roadmap governs implementation after Architecture Gita v1.0. The current application is a development shell with sample data only. Canonical domains are built first; a coordinated cutover occurs after the core architecture is complete.

## Status

| Phase | Scope | Status |
|---|---|---|
| PR #13 | Membership foundation and UI | Completed / merged |
| PR #14 | Program and Program Offering | Completed / merged |
| PR #15 | Terms and Sessions | Completed / merged |
| PR #16 | Membership Term Participation | Completed / merged |
| PR #17A | Credit Ledger Foundation | In progress |
| PR #17B | Payment Processing and Allocations | Planned |
| PR #18 | Attendance Integration | Planned |
| PR #19 | Coordinated Application Cutover | Planned |
| PR #20 | Legacy Removal and Cleanup | Planned |

## Completed capabilities

### PR #14 — Program and Program Offering

- Canonical Program domain for reusable academic definitions.
- Canonical Program Offering domain for operational delivery.
- Separate persistence for Programs and Offerings.
- Organization-scoped uniqueness and query indexes.
- Validation, lifecycle history, audit records, and transactional outbox records.
- Administrator UI for creating, editing, archiving, and restoring Programs and Offerings.
- No migration framework, Legacy Mapping UI, synchronization, or dual writes.
- Legacy application remains an unchanged temporary development shell.

### PR #15 — Academic Calendar

- First-class Terms beneath Program Offerings.
- First-class Sessions beneath Terms.
- Configurable, repeatable, idempotent Session generation with preview.
- Preservation of manually modified, cancelled, rescheduled, and archived Sessions during regeneration.
- Term and Session lifecycle management, audit logging, and outbox integration.

### PR #16 — Membership Term Participation

- First-class Participation relationship between Membership, Program Offering, and Term.
- Participation lifecycle management with audit history.
- Validation of active Memberships and matching Program Offering/Term relationships.
- Duplicate active Participation prevention.
- Administrator UI and organization-scoped APIs.

PR #13 through PR #16 are merged into `main`. PR #17A is the current implementation phase.

## PR #17A — Credit Ledger Foundation

The current branch introduces the append-only Credit Ledger foundation:

- Immutable ledger entries with structured reason codes and administrator descriptions.
- Calculated balances and running balances; no persisted mutable balance.
- Mandatory source references for business-action traceability.
- Idempotent manual adjustment command.
- Organization-scoped API, audit logs, and Transactional Outbox events.
- Dedicated Credits & Ledger administrator page.
- Payment Transactions and Payment Allocations remain out of scope for PR #17A.

## Governance

- Canonical domains are implemented with explicit contracts and tests.
- The development shell is temporary and must not receive new business capabilities.
- No migration framework, synchronization, or dual writes are introduced.
- Demo data is regenerated using the canonical model during the coordinated cutover.
- Each completed PR updates this document with delivered capabilities, remaining risks, and the next dependency.
- PR #17B must not begin until PR #17A has been reviewed and merged.

## Cutover sequence

PR #19 will move Students, enrollment, Fees, Attendance, Reports, imports, backups, Parent Portal, and dashboard consumers to canonical relationships. PR #20 will remove obsolete legacy routes, fields, seed logic, and collections after the cutover is verified.

## Current remaining work

Credit Ledger review and merge, Payment Processing and Allocations, Attendance integration, coordinated application cutover, and legacy cleanup remain outstanding.
# Gokulam360 Implementation Roadmap

This roadmap governs implementation after Architecture Gita v1.0. The current application is a development shell with sample data only. Canonical domains are built first; a coordinated cutover occurs after the core architecture is complete.

## Status

| Phase | Scope | Status |
|---|---|---|
| PR #13 | Membership foundation and UI | Completed / merged |
| PR #14 | Program and Program Offering | Completed / merged |
| PR #15 | Terms and Sessions | Completed / merged |
| PR #16 | Membership Term Participation | In progress |
| PR #17 | Credit Ledger and Payments | Planned |
| PR #18 | Attendance Integration | Planned |
| PR #19 | Coordinated Application Cutover | Planned |
| PR #20 | Legacy Removal and Cleanup | Planned |

## Completed capabilities

### PR #14 — Program and Program Offering

- Canonical Program domain for reusable academic definitions.
- Canonical Program Offering domain for operational delivery.
- Separate persistence for Programs and Offerings.
- Organization-scoped uniqueness and query indexes.
- Validation, lifecycle history, audit records, and transactional outbox records.
- Administrator UI for creating, editing, archiving, and restoring Programs and Offerings.
- No migration framework, Legacy Mapping UI, synchronization, or dual writes.
- Legacy application remains an unchanged temporary development shell.

PR #14 was merged into `main` in merge commit `2876ecd24cd9012308e2d8830d0be8bf2ccba05d`.

## Governance

- Canonical domains are implemented with explicit contracts and tests.
- The development shell is temporary and must not receive new business capabilities.
- No migration framework, synchronization, or dual writes are introduced.
- Demo data is regenerated using the canonical model during the coordinated cutover.
- Each completed PR updates this document with delivered capabilities, remaining risks, and the next dependency.

## Cutover sequence

PR #19 will move Students, enrollment, Fees, Attendance, Reports, imports, backups, Parent Portal, and dashboard consumers to canonical relationships. PR #20 will remove obsolete legacy routes, fields, seed logic, and collections after the cutover is verified.

## Current remaining work

Terms, Sessions, Membership Term Participation, Credit Ledger, Payments, Attendance integration, coordinated consumer cutover, and legacy cleanup remain outstanding.
