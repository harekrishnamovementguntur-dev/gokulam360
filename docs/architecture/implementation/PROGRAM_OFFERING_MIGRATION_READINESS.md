# PR #14 Architecture Readiness Report

## Canonical functionality delivered

- Canonical Program domain and lifecycle.
- Canonical Program Offering domain and lifecycle.
- Organization-scoped APIs, indexes, validation, audit records, and outbox records.
- Administrator UI for creating, editing, archiving, and restoring canonical Programs and Offerings.
- Canonical domain tests.

## Explicitly removed

- Legacy Mapping UI.
- `/api/migration-mappings`.
- `migration_mappings` indexes and persistence.
- Legacy-to-canonical synchronization or dual writes.

## Development-shell status

The current Classes & Batches, enrollment, Fees, Attendance, reporting, import/export, backup, and Parent Portal flows remain on the temporary development runtime. They are intentionally not refactored in PR #14.

## Risks

- Canonical and legacy runtime code coexist temporarily while the architecture is completed.
- Cross-domain integration is deferred and must be covered by contract tests before cutover.
- The legacy runtime must not receive new business capabilities.

## Recommended roadmap

- PR #15: Terms and Sessions.
- PR #16: Membership Term Participation.
- PR #17: Credit Ledger and Payments.
- PR #18: Attendance Integration.
- PR #19: Coordinated Application Cutover and regenerated demo data.
- PR #20: Legacy Removal and Cleanup.
