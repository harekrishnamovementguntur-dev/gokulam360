# Payment & Credit Ledger Reports

PR #26 adds report-specific canonical read services for financial data.

## Scope

- Payments report from payment_transactions, enriched with payment allocation counts, amounts, and granted credits.
- Credit Ledger report from immutable credit_ledger_entries, enriched with the current calculated membership balance.
- Organization-scoped administrator UI with Payments and Credit Ledger tabs.
- Shared filters, cursor pagination, and current-page CSV export.

This PR does not change payment posting, refunds, ledger mutations, Attendance, dashboards, or full export infrastructure.

## APIs

- GET /api/reports/payments
- GET /api/reports/ledger

Financial reports require an authenticated super_admin or org_admin. The organization scope always comes from authentication; organization_id supplied by a client is rejected by the shared reporting foundation.

Common filters include from, to, membership_id, student_id, page_size, cursor, sort, and direction.

Payment-specific filters:

- status
- kind

Ledger-specific filters:

- reason_code
- source_type

## Canonical sources

Payments reads payment_transactions and payment_allocations. Credit Ledger reads credit_ledger_entries and memberships. No legacy fees, attendance, or catch-all reporting collection is read.

The Ledger report never stores or reads a persisted balance. membership_balance is calculated by summing immutable ledger entries at read time.

## Administrator experience

The Payment Reports navigation item provides Payments and Credit Ledger tabs, date/status/reason filters, loading/error/empty states, bounded cursor pagination, and current-page CSV export. Full streaming exports remain deferred.

## Performance and security

All aggregations begin with organization_id. Production readiness should confirm compound indexes for organization plus created/effective dates, membership, status, and reason/source filters. Financial reports are restricted to organization administrators to avoid exposing payment information to teaching roles.

## Verification

Automated coverage is provided by test:finance-reports. Preview build and authenticated database-backed report verification are deployment checks for the PR review stage.
