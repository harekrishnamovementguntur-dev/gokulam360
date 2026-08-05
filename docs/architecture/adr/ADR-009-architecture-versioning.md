# ADR-009: Version the Architecture Gita

**Status:** Accepted

## Problem

Replacing the governing architecture document in place makes it impossible to understand which rules applied to a historical implementation decision.

## Alternatives

1. Maintain one continuously edited Architecture Gita.
2. Store document history only in Git commits.
3. Keep each approved Architecture Gita as a named, immutable version and use ADRs for changes.

## Decision

Architecture Gita v1.0 is the immutable approved baseline. Future revisions are created as new versioned documents, accompanied by ADRs and an explicit migration/compatibility statement. The Business Rule Catalogue identifies the active invariants for its applicable version.

## Consequences

Architecture governance is auditable and future developers can reconstruct decisions. Maintaining versions requires editorial discipline, but prevents informal architecture drift.
