# ADR-012: Separate Payment Transactions from Credit Allocations

- Status: Accepted for PR #17B
- Date: 2026-07-31

## Problem

Gokulam360 must record money received, allocate it across Memberships, grant credits, and support refunds without conflating money with operational credits or rewriting history.

## Decision

Use Payment Transactions as the Money aggregate and Payment Allocations as immutable links from a posted transaction to Memberships. Payment creation creates a draft. Posting is a separate command. Only posting creates Credit Ledger entries. Refunds create a new compensating Payment Transaction and negative Payment Allocations.

All mutation commands require idempotency keys and atomically persist business records, Credit Ledger entries where applicable, audit logs, and outbox events.

## Consequences

- Posted allocations cannot be edited or deleted.
- Corrections are represented by refunds or compensating allocations.
- A Payment Transaction can allocate one payment to multiple Memberships.
- Receipt numbers are administrator-friendly identifiers; internal UUIDs remain the primary keys.
- Payment methods are extensible values validated against the current configured set.
- Atomic posting requires MongoDB transaction support.
