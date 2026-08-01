# Members & Membership Reports

PR #25 implements the first report-specific read services on top of the reporting foundation.

## Scope

This PR provides organization-scoped read reports for:

- Members: canonical students records with membership counts.
- Memberships: canonical memberships records enriched with the linked student and term-participation counts.

It does not implement Payments, Credit Ledger, Attendance, dashboards, or changes to the legacy Reports screen.

## APIs

- GET /api/reports/members
- GET /api/reports/memberships

Both endpoints require an authenticated super_admin, org_admin, or teacher and derive organization scope from the authenticated user. A client-supplied organization_id is rejected by the shared foundation.

Supported filters include status, student_id, membership_id, program_id, program_offering_id, term_id, from, to, page_size, cursor, sort=created_at|id, and direction=asc|desc.

The response follows the reporting contract: items, summary.total, page, filters, and meta.contract_version.

## Administrator experience

The new Member Reports navigation item provides separate Members and Memberships tabs, status/date filters, cursor pagination, loading/error/empty states, and export of the currently loaded page as CSV. Full streaming export is intentionally deferred to the exports phase.

## Canonical data and isolation

Queries begin with the authenticated organization scope and read only students, memberships, and membership_term_participations. The legacy catch-all Reports implementation is not extended.

## Performance

Aggregation starts with organization filters, uses bounded pages of 50 (maximum 200 from the shared contract), and uses deterministic created_at/id sorting. Production verification should add or confirm compound indexes for organization plus the report sort/filter fields before large datasets are onboarded.

## Verification

Automated coverage is provided by test:members-reports. Preview authentication and database-backed aggregation verification remain deployment checks for the PR review stage.
