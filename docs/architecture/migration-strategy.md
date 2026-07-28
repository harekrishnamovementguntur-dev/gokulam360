# Migration Strategy

## Goal

Move from the current student-program IDs, program fee amount, fee records, and session-credit logic to memberships, offerings, participation, payments, and an immutable credit ledger without losing history.

## Non-Negotiable Rule

Do not Git-revert PR7/PR8 as a production-data operation. Their code introduced fields and records that may already have affected live data. The replacement will not depend on that logic, but migration must preserve and reconcile its history.

## Phases

1. **Documentation and inventory** — approve Architecture Gita and ADRs; inventory collections, indexes, record volumes, and data-quality gaps.
2. **Additive schema** — introduce new collections and indexes only. No existing write path changes.
3. **Backfill** — create memberships, offerings, terms, participations, payment transactions, and ledger entries from legacy data with migration source references.
4. **Reconciliation** — compare legacy fee totals, attendance counts, and migrated balances per organization; produce exceptions rather than guessing.
5. **Dual read** — expose read-only projections from the new model alongside legacy views.
6. **Dual write** — after acceptance, write new commands to both models with idempotency and audit IDs.
7. **Cutover** — route UI and reporting writes/reads to the new model.
8. **Archive legacy** — preserve legacy records as read-only historical data; remove legacy features only after verified cutover.

## Rollback

Additive migrations are reversible by disabling new projections and command routing. Ledger and payment entries are never deleted; any correction is a compensating record.

## Acceptance Gates

- Tenant isolation test passes.
- Ledger balance reconciliation passes or documented exceptions are approved.
- Attendance correction creates exactly one compensating ledger effect.
- Historical reports match agreed legacy baselines.
- No production deletion is required.
