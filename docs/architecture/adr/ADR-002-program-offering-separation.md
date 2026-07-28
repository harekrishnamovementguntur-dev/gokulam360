# ADR-002: Separate Programs from Program Offerings

**Status:** Accepted

## Problem

The current Program combines curriculum, schedule, batch, dates, capacity, and fee amount, preventing reuse and concurrent deliveries.

## Alternatives

1. Keep all delivery data on Program.
2. Duplicate Programs for every batch.
3. Keep Program academic and create Program Offering plus Term.

## Decision

Program owns reusable academic definition. Program Offering owns cohort/delivery configuration; Terms and Sessions belong below it.

## Consequences

Organizations can run concurrent offerings, change batches, and reuse curriculum without duplicating program identity. Programs do not own pricing.
