# Gokulam360 Architecture Gita v1.0

**Version:** 1.0  
**Status:** Approved architecture baseline  
**Scope:** Long-term multi-organization educational and organization management platform

## 1. Product Vision

Gokulam360 is a configurable platform for Sunday schools, Gurukuls, preschools, camps, weekend schools, temple education programs, spiritual organizations, and future educational institutions. It supports each organization through configuration, not organization-specific code branches.

Technology serves administration, learning, character, community, knowledge, and devotional service with simplicity, integrity, and long-term sustainability.

## 2. Principles

1. Configuration over hardcoding.
2. Domain-driven modular monolith first; do not introduce microservices prematurely.
3. Every important business entity owns a lifecycle and append-only history.
4. Corrections use reversals, compensating records, or state transitions; historical business data is never destructively overwritten.
5. All tenant-owned data is organization-scoped.
6. Auditability and idempotency are required for financial, credit, attendance, and lifecycle operations.
7. Modules publish domain events through a transactional outbox.
8. Reports derive from immutable transactions and snapshots, not mutable current values.
9. Terms in the [Glossary](./GLOSSARY.md) are canonical for database names, APIs, documentation, and UI labels.

## 3. Core Domain

A **Program** is reusable academic definition: curriculum, objectives, age guidance, attendance rules, credit-consumption rules, and certificate criteria. It has no price.

A **Program Offering** is an actual delivery of a program for an organization, cohort, batch, or period. It owns operational schedule, capacity, teachers, and configured delivery settings.

A **Term** belongs to an offering. A **Session** belongs to a term and owns date, time, teacher, topic, location, status, and attendance.

A **Membership** is the durable student-to-program relationship. It survives terms, years, offerings, and batch changes. A **Membership Term Participation** is time-bound membership participation in a specific offering and term.

## 4. Membership Lifecycle

Permitted membership states:

- Pending
- Active
- Paused
- Completed
- Inactive
- Archived

Memberships are never deleted. State transitions require an audit record. Students, programs, content, payments, attendance, achievements, and certificates similarly preserve business history through lifecycle states, voids, reversals, or archival.

## 5. Credits and Payments

Credits and money are separate domains.

- Administrators record custom amount, currency, payment method, and custom credit quantity.
- There are no billing policies, fixed prices, credit packs, or automated pricing rules in version 1.
- A payment transaction may allocate money and/or grant credits to one or more memberships.
- Credit balance is calculated only from immutable Credit Ledger entries.
- Direct credit-balance editing is prohibited.
- Negative balances are allowed and produce warnings; attendance is not blocked.

Credit transfers are disabled by default. If an organization enables them later, the transfer must create an explicit debit and credit pair with reason, approver, and audit trail.

## 6. Attendance

Attendance belongs to a Session and a Membership Term Participation.

- Present consumes the configured credit quantity when credit consumption is enabled.
- Absent, Holiday, and Cancelled Session do not consume credits.
- Correcting or voiding attendance creates compensating ledger entries.
- Attendance remains independent from payment collection.

## 7. Content Management

Content Management replaces event-only presentation. It supports configurable types: Event, Bhagavad-gita Verse, Srimad Bhagavatam Verse, Srila Prabhupada Quote, Festival, News, Announcement, Story, Video, Audio, Gallery, PDF, and Custom Content.

Content supports type-specific metadata, multiple assets, audience targeting by organization, program, offering, academic year, membership status, age group, publish/expiry date, priority, and visibility. Krishna Conscious organizations receive first-class scripture, source, transliteration, translation, purport-summary, and practical-application fields, while the underlying content model remains generic.

Each Program Offering may feature at most three content items. Dashboard Configuration decides the presentation. Parent experiences show only featured content relevant to a child's active memberships and merge duplicate items across memberships.

## 8. Organization Configuration

Configuration is composed from dedicated, versioned modules rather than one mutable settings object:

- Academic Policies
- Attendance Policies
- Credit Policies
- Dashboard Configuration
- Content Configuration
- Notification Configuration
- Certificate Configuration
- Branding
- Theme
- Permissions
- Reports

Every module is organization-scoped, has an owner and lifecycle, and publishes an audit record when changed. Program and Program Offering may reference relevant configuration versions but do not own global organization policy.

## 9. Achievements

Achievements attach to Memberships and support completion, attendance milestones, awards, volunteer service, reading milestones, examinations, teacher recognition, and organization-specific recognition. They become the source for future badges, certificates, dashboards, and reports.

## 10. Events and Integration

The system remains a modular monolith. Each successful command writes its business record, audit entry, and outbox event atomically. Asynchronous workers deliver notifications, dashboard projections, analytics, WhatsApp, email, push notifications, and future integrations.

## 11. Security and Reporting

Every API operation enforces organization scope and capability-based authorization. Financial and credit mutations require idempotency keys. Reports are membership-centric and ledger-derived, preserving historical meaning even when programs, offerings, or configuration later change.

## 12. Authorization Scope Model

Authorization scope is determined by the operation and the authenticated actor's role. An `organization_id` is a tenant-resource scope; it is not a requirement that every authenticated user belong to an organization.

### Platform-scoped operations

Platform-scoped operations operate across organizations and are available only to explicitly authorized Platform actors, currently Super Admins. Examples include:

- Creating an Organization.
- Listing Organizations.
- Assigning the first Organization Administrator during Organization creation.
- Platform-level administration and organization lifecycle operations.

These operations must not require, derive, or validate an authenticated user's `organization_id`.

### Tenant-scoped operations

Tenant-scoped operations create, read, or change data owned by one Organization. For Organization Administrators, Teachers, and other tenant users, the organization scope must be derived from the authenticated context. A client-supplied `organization_id` must not override that authenticated scope.

### Super Admin performing a tenant-scoped operation

A Super Admin does not belong to any Organization. When a Super Admin performs a tenant-scoped operation, the request must identify an explicit target Organization. The target is a selected resource scope, not the Super Admin's identity or membership.

The target Organization must:

- Be supplied explicitly where the command requires tenant scope.
- Be validated as an existing, eligible Organization.
- Be recorded in authorization, audit, and domain event metadata.
- Never be inferred from the first available Organization, stale UI state, or a null Super Admin context.

Global operations must not be routed through this target-organization rule. Future APIs and UI flows must declare whether they are platform-scoped, tenant-scoped, or Super Admin tenant-scoped before implementation.

This clarification is documented in [ADR-014](./adr/ADR-014-authorization-scope.md).

## 12. Governance and Versioning

This document is the approved **Architecture Gita v1.0**. It is an immutable baseline once merged. Future architectural revisions must create a new, versioned Architecture Gita document and ADRs explaining the change; they must not silently replace v1.0. Every new module must define its lifecycle, audit events, organization scope, permissions, API contract, and reporting implications before implementation.

The [Business Rule Catalogue](./BUSINESS_RULES.md) is authoritative for invariants. Rule changes require an ADR and the next applicable Architecture Gita version.
