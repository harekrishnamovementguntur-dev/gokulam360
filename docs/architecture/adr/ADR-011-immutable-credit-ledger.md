# ADR-011: Immutable Credit Ledger as the Credit Source of Truth

- Status: Proposed for PR #17A
- Date: 2026-07-29

## Problem

Gokulam360 needs to track credits across Memberships without mutable balances, lost history, or ambiguity about why a credit changed.

## Alternatives considered

1. Store a mutable credit balance on Membership.
2. Store credit changes as editable fields on Membership.
3. Use an append-only Credit Ledger and calculate balances from its entries.

## Decision

Use an organization-scoped `credit_ledger_entries` collection as the single source of truth. Every entry is immutable, signed, linked to one Membership, and includes a structured reason, optional description, and source reference.

The current PR exposes manual adjustments only. Future Attendance and Payment commands will create entries through the same service with their own source references.

Manual adjustments are exceptional administrative operations. They require an idempotency key and remain permanently auditable.

## Consequences

- Balance calculation is deterministic and historically reproducible.
- Negative balances are supported without special mutation paths.
- Corrections and refunds require compensating entries.
- Payment Transactions remain a separate money domain.
- Queries require calculating a running balance rather than reading a stored balance.
- Future integrations must preserve source references and append-only behavior.
