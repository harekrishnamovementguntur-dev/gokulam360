# Credit Ledger — PR #17A

## Purpose

The Credit Ledger is the single source of truth for Membership credit balances. It is separate from money and Payment Transactions.

## Invariants

- Ledger entries are append-only.
- No mutable balance is stored.
- Balance is calculated from the signed sum of entries.
- Every entry has a structured `reason_code` and optional administrator `description`.
- Every entry has `source_type` and `source_id` so the originating business action is traceable.
- Negative balances are allowed and displayed as warnings.
- Financial mutations require an `Idempotency-Key`.
- Audit logs and Transactional Outbox events are written in the same transaction.

## Manual adjustments

Manual adjustments are exceptional administrative operations. The UI requires a structured reason and offers free-text context. Each adjustment receives an immutable command/source identifier and is permanently auditable; administrators cannot edit or delete the resulting entry.

## API

- `GET /api/credit-ledger?membership_id=...`
- `POST /api/credit-ledger`

The POST endpoint currently supports manual adjustments only. Future Attendance and Payment commands will use the same ledger service with their own source references.

## UI

The dedicated `/credit-ledger` page lets administrators select a Membership, view the calculated balance and running balance, and post an auditable adjustment. The existing Fees module is intentionally unchanged until the coordinated cutover phase.

## Out of scope

Payment Transactions, Payment Allocations, refunds, Attendance integration, Parent Dashboard changes, Notifications, Reports, and application cutover.
