# Reporting Contracts and Read-Service Foundation

Status: PR #24 — In progress

## Purpose

This document defines the reusable reporting infrastructure for canonical Gokulam360 domains. It intentionally does not implement report-specific aggregation or Dashboard UI.

## Canonical boundary

Reporting is a read-only query boundary. It may read canonical domains through future query services, but it does not own Students, Memberships, Payments, Credit Ledger Entries, Attendance Records, Program Offerings, Terms, or Sessions.

PR #24 does not read the legacy catch-all route or legacy collections.

## API contract

Report and dashboard APIs require authentication and derive organization scope from the authenticated user. A client-supplied \`organization_id\` is rejected by shared filter validation.

Report response shape:

\`\`\`json
{
  "items": [],
  "summary": {},
  "page": {
    "page_size": 50,
    "next_cursor": null,
    "has_more": false
  },
  "filters": {},
  "meta": {
    "contract_version": "1.0",
    "generated_at": "2026-08-01T00:00:00.000Z"
  }
}
\`\`\`

Errors use:

\`\`\`json
{
  "error": {
    "code": "invalid_date_range",
    "message": "from must not be after to"
  }
}
\`\`\`

## Routes introduced

- \`GET /api/reports\` — authenticated report catalog.
- \`GET /api/reports/:report\` — authenticated, scoped foundation endpoint; returns a deliberate 501 until a report-specific PR implements the resource.
- \`GET /api/dashboards\` — authenticated dashboard catalog.
- \`GET /api/dashboards/:dashboard\` — authenticated, scoped foundation endpoint; returns a deliberate 501 until a dashboard-specific PR implements the resource.

Planned report names:

- members
- memberships
- payments
- ledger
- attendance
- attendance-summary

Planned dashboard names:

- organization
- teacher
- finance

## Shared filters

Supported filters:

- \`from\`, \`to\`
- \`program_id\`
- \`program_offering_id\`
- \`term_id\`
- \`session_id\`
- \`membership_id\`
- \`student_id\`
- \`status\`
- \`page_size\` (1–200, default 50)
- \`cursor\`
- \`sort\`
- \`direction\`

The foundation validates filters only. It does not query a domain collection.

## Pagination

Cursors are opaque versioned Base64URL payloads containing the sort value, stable entity ID, sort field, and direction.

The cursor utility produces a Mongo-compatible continuation predicate using the sort field plus ID tie-breaker. Future read services must apply organization scope and domain filters before this predicate.

## Exports

\`lib/reporting-export.mjs\` defines common CSV, XLSX, and PDF formats and a delivery plan. It does not generate files in PR #24. Production exports are scheduled for PR #29.

## Security and error handling

- Roles are checked before reporting access.
- An organization context is mandatory.
- Client organization overrides are rejected.
- Unknown report/dashboard names return 404.
- Planned-but-unimplemented resources return 501.
- Unexpected errors are logged server-side and return a generic 500 response.
- The current role model has no dedicated Finance role; finance authorization requires a later permission decision.

## Tests

\`test/reporting-foundation.test.mjs\` covers:

- Filter validation
- Date range validation
- Cursor encoding, decoding, and continuation predicates
- Organization authorization
- Response contract consistency
- Export planning
- Stable machine-readable error codes

## Deliberate non-scope

- No report-specific aggregations
- No dashboard UI
- No legacy collection reads
- No Attendance reporting until PR #22A is merged
- No CSV/PDF/XLSX generation
- No caching or materialized read models
