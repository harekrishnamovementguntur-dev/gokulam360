# Business Rule Catalogue

**Authority:** Architecture Gita v1.0  
**Purpose:** The definitive catalogue of domain invariants. A rule change requires an ADR and the next applicable Architecture Gita version.

## Identity and tenancy

- **BR-001** Every tenant-owned business entity belongs to exactly one Organization.
- **BR-002** Organization scope is enforced for every server-side read and mutation.
- **BR-003** A Student is an organization-scoped person record and may hold multiple Memberships.

## Academic structure

- **BR-010** A Program is a reusable academic definition and never owns pricing, payment rules, or credit packs.
- **BR-011** A Program Offering belongs to exactly one Program and represents a concrete delivery.
- **BR-012** A Term belongs to exactly one Program Offering.
- **BR-013** A Session belongs to exactly one Term and owns its date, time, teacher, topic, location, and lifecycle status.\n- **BR-014** Session numbers are assigned by the server within a Term and are immutable.\n- **BR-015** Session generation is preview-first, repeatable, and additive; it never overwrites an existing Session.\n- **BR-016** A generated Session has generated ownership until an administrator creates or modifies it; manual, cancelled, rescheduled, holiday, and archived Sessions are preserved during regeneration.\n- **BR-017** A generation run records its configuration, created Sessions, preserved Sessions, excluded dates, and holiday reasons.

## Membership and participation

- **BR-020** A Membership belongs to exactly one Student and exactly one Program.
- **BR-021** A Membership is durable across Terms, academic years, offerings, and batch changes.
- **BR-022** A Membership Term Participation belongs to exactly one Membership, one Program Offering, and one Term.
- **BR-027** Participation requires an Active Membership, and its Program Offering must belong to that Membership's Program.
- **BR-028** The selected Term must belong to the selected Program Offering and Organization.
- **BR-029** Only one Active Participation may exist for the same Membership and Term; Participation references are immutable after creation.
- **BR-023** Membership lifecycle states are Pending, Active, Paused, Completed, Inactive, and Archived only.
- **BR-024** Memberships are never deleted. Lifecycle changes are recorded as history and audit events.
- **BR-025** Archiving is reversible only through an audited lifecycle transition that restores the immediately preceding Membership status.
- **BR-026** A Student and Program may have at most one non-archived Membership in an Organization. A Completed Membership is reactivated rather than replaced; restoring an archived Membership is rejected while another non-archived Membership exists for that Student and Program.

## Attendance

- **BR-030** An Attendance Record belongs to exactly one Session and exactly one Membership Term Participation.
- **BR-031** Attendance is operationally independent of payment collection and cannot be blocked merely because a credit balance is zero or negative.
- **BR-032** Present consumes credits only when the applicable Credit Policy enables consumption.
- **BR-033** Absent, Holiday, and Cancelled Session do not consume credits.
- **BR-034** Attendance correction, void, or deletion preserves history and produces a compensating credit effect when one is required.

## Credits and payments

- **BR-040** Credits belong to a Membership and never move between Memberships unless a future organization policy explicitly enables an audited transfer.
- **BR-041** The Credit Ledger is append-only; no ledger entry may be edited or deleted after posting.
- **BR-042** A Membership credit balance is calculated from the signed sum of its Credit Ledger entries and is never stored as an editable source of truth.
- **BR-043** Credits and money are separate domains. Payment Transactions are not Credit Ledger entries.
- **BR-044** A Payment Transaction may have one or more Payment Allocations; each allocation identifies the receiving Membership and any credits granted.
- **BR-045** Refunds, reversals, attendance corrections, and manual adjustments create new linked transactions or ledger entries instead of mutating history.
- **BR-046** Version 1 has no Billing Policies, fixed prices, credit packs, or automated pricing rules. Administrators enter custom amount and custom credit quantity.
- **BR-047** Financial and credit mutation commands require idempotency protection.

## Content and dashboard

- **BR-050** A Content Item has one configured Content Type, lifecycle, publish window, visibility, and organization scope.
- **BR-051** Supported baseline types are Event, Bhagavad-gita Verse, Srimad Bhagavatam Verse, Srila Prabhupada Quote, Festival, News, Announcement, Story, Video, Audio, Gallery, PDF, and Custom Content.
- **BR-052** Content may target Programs, Program Offerings, academic years, membership statuses, and age groups.
- **BR-053** A Program Offering may have at most three active Featured Content selections.
- **BR-054** A parent sees only featured content relevant to the child’s Active Memberships; duplicate items are displayed once.

## Configuration, audit, and reporting

- **BR-060** Organization configuration is divided into dedicated, versioned modules; it is not one mutable settings object.
- **BR-061** Every important business operation records an audit entry with actor, action, entity, timestamp, and correlation information.
- **BR-062** A successful business command atomically persists its state change, audit record, and Transactional Outbox event.
- **BR-063** Reports must preserve historical meaning by using immutable transactions, snapshots, and versioned configuration references rather than mutable current values.
- **BR-064** Achievements belong to Memberships and preserve issuer, evidence, dates, and lifecycle history.
