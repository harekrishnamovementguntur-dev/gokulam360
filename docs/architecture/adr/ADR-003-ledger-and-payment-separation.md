# ADR-003: Use Separate Credit and Payment Ledgers

**Status:** Accepted

## Problem

Fee records cannot accurately model custom payment amounts, custom credit quantities, refunds, adjustments, negative balances, or audit-safe corrections.

## Alternatives

1. Editable balance field on membership.
2. One combined fee/credit record.
3. Immutable Credit Ledger plus separate Payment Transactions and Allocations.

## Decision

Use append-only Credit Ledger Entries for operational units and separate immutable Payment Transactions for money. Payments may allocate credits to memberships.

## Consequences

Credit balances are reproducible, money remains auditable, and future payment gateways or partial allocations do not change the domain model.
