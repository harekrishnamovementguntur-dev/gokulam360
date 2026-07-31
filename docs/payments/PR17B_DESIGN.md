# PR #17B — Payment Transactions & Allocations

## Scope

This bounded context introduces Payment Transactions, Payment Allocations, posting, refunds, audit/outbox integration, and idempotency. It does not change the Credit Ledger model or implement Attendance, Reports, Notifications, or Cutover.

## Workflow

1. Administrator creates a Payment Transaction as a draft.
2. The system assigns a receipt number and records amount, currency, method, and description.
3. Administrator posts the draft with one or more allocations.
4. Posting atomically marks the payment posted, inserts immutable allocations, grants credits through Credit Ledger entries, and writes audit/outbox records.
5. An administrator may refund a posted payment. A refund is a new compensating Payment Transaction with negative allocations and negative Credit Ledger entries.
6. Posted transactions and allocations cannot be edited or deleted.

## Collections

- payment_transactions: Money aggregate and lifecycle.
- payment_allocations: immutable allocation records.
- Existing credit_ledger_entries: credit source of truth.
- Existing audit_logs and outbox_events: atomic history/integration records.

## Lifecycle

Payment Transaction: draft -> posted -> partially_refunded -> refunded. A void command is reserved for a later refinement. Refund transactions are created directly as posted compensating transactions.

## API

- GET /api/payments
- POST /api/payments — create draft; requires Idempotency-Key.
- GET /api/payments/:id
- POST /api/payments/:id — post by default or refund with command=refund; requires Idempotency-Key.

## Risks and mitigations

- Transaction support is required; no non-atomic fallback is allowed.
- Refund proportional allocation rounding may leave tiny residuals; the next refinement should make refund allocation selection explicit for multi-membership payments.
- Receipt numbers use a human-readable unique identifier backed by a database unique index.
- Organization scope is resolved server-side and checked on every Membership and Payment lookup.
