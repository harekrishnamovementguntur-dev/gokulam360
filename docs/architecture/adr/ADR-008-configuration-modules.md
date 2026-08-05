# ADR-008: Use Dedicated Organization Configuration Modules

**Status:** Accepted

## Problem

A single Organization settings document becomes a high-conflict, weakly validated collection of unrelated rules. It obscures ownership, history, permissions, and effective-date changes.

## Alternatives

1. One mutable organization settings object.
2. Store every policy directly on Program or Program Offering.
3. Use dedicated, versioned organization configuration modules.

## Decision

Use separate organization-scoped modules for Academic Policies, Attendance Policies, Credit Policies, Dashboard Configuration, Content Configuration, Notification Configuration, Certificate Configuration, Branding, Theme, Permissions, and Reports. Programs and Offerings may reference a configuration version for reproducibility but do not own organization-wide policy.

## Consequences

Each configuration area can evolve, validate, authorize, audit, and version independently. The design adds more collections and references, but avoids a monolithic settings object and preserves the policy context behind historical operations.
