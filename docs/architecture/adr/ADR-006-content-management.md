# ADR-006: Replace Event-Only Presentation with Content Management

**Status:** Accepted

## Problem

A dedicated Events model cannot represent scripture, quotes, announcements, news, stories, and future organization content without repeated schema changes.

## Alternatives

1. Extend Events with many nullable fields.
2. Build separate modules for each content type.
3. Create generic content items with typed metadata and audience targets.

## Decision

Use Content Items, Content Types, Assets, and Content Targets. Events become one supported type. Featured content is selected per Program Offering, maximum three items.

## Consequences

Parent and dashboard experiences are configurable and reusable. Type-specific validation is handled through versioned content schemas rather than one rigid event form.
