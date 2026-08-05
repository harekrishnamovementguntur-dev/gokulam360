# ADR-008: Canonical Program and Program Offering Foundation

## Problem

The current application uses a legacy `programs` model that mixes academic definition with operational delivery, sessions, capacity, dates, and fees. The application is not in production and contains only development/demo data, so a migration framework would add complexity without protecting customer data.

## Decision

PR #14 introduces canonical Program and Program Offering domains without a legacy mapping framework.

- Canonical Programs are stored in `academic_programs`.
- Program Offerings are stored in `program_offerings`.
- The administrator UI exposes only canonical Programs and Offerings.
- No `migration_mappings` collection, mapping API, mapping UI, synchronization, or dual writes are introduced.
- The existing application remains a temporary development shell while the remaining canonical domains are implemented.

The canonical domains communicate through explicit repositories, services, and contracts. The later coordinated cutover will regenerate demo data and move the legacy application consumers to the canonical model.

## Consequences

This keeps PR #14 small and reviewable and avoids a migration subsystem that is not required before first production deployment. During the architecture-building phase, the legacy runtime remains isolated and unchanged; it must not be expanded or treated as the future production source of truth. The cutover phase will remove the legacy runtime and finalize canonical collection naming if required.
