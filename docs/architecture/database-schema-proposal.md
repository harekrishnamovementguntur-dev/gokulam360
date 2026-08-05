# Database Schema Proposal

## Conventions

Every tenant record includes `id`, `organization_id`, `status`, `created_at`, `created_by`, `updated_at`, and version/audit metadata where appropriate. Financial, credit, attendance, audit, and outbox records are append-only. MongoDB indexes always begin with `organization_id` for tenant-owned collections.

## Core Collections

| Collection | Purpose | Important fields / indexes |
|---|---|---|
| organizations | Tenant root and identity | `id`, lifecycle, default currency |
| organization_academic_policies | Versioned academic policy module | organization, effective period, term/session policy |
| organization_attendance_policies | Versioned attendance policy module | organization, permitted statuses, correction policy |
| organization_credit_policies | Versioned credit policy module | organization, consumption rules, transfer/expiry controls |
| dashboard_configurations | Versioned dashboard module | organization, audience, featured-content layout |
| content_configurations | Versioned CMS module | organization, enabled types, schemas, moderation rules |
| notification_configurations | Versioned notification module | organization, channels, templates, delivery rules |
| certificate_configurations | Versioned certificate module | organization, templates, issue criteria |
| branding_configurations | Versioned branding module | organization, logos, identity assets |
| theme_configurations | Versioned theme module | organization, visual tokens |
| permission_policies | Versioned authorization module | organization, roles, capabilities |
| report_configurations | Versioned report module | organization, report definitions, visibility |
| students | Person master record | identity, contacts, lifecycle; unique organization/student number |
| programs | Reusable academic definition | curriculum, credit/attendance defaults; no price |
| program_offerings | Cohort/batch delivery | program, teachers, capacity, schedule, lifecycle |
| terms | Delivery period | offering, academic year, start/end, lifecycle |
| sessions | Actual class meeting | term, date/time, teacher, topic, location, status |
| memberships | Durable student-program relationship | student, program, lifecycle, activation history |
| membership_term_participations | Time-bound participation | membership, offering, term, batch, status |
| attendance_records | Session attendance | session, participation, marked status, correction chain |
| credit_ledger_entries | Immutable operational credits | membership, signed quantity, reason, source reference, idempotency key |
| payment_transactions | Immutable money records | payer, amount, currency, method, provider reference, status |
| payment_allocations | Links payment to memberships | payment, membership, allocated amount, credits granted |
| achievements | Membership accomplishments | type, evidence, issuer, dates |
| content_items | Generic managed content | type, structured body, publishing lifecycle, priority |
| content_assets | Media and documents for content | content, asset type, storage reference, metadata, ordering |
| content_targets | Content audience scope | content, program/offering, academic year, membership status, age group |
| featured_content | Explicit dashboard selection | content, offering, position; max three active entries per offering |
| audit_logs | Security and business audit | actor, entity, action, before/after summary |
| outbox_events | Reliable domain-event delivery | event type, aggregate, payload, status, idempotency |
| report_snapshots | Reproducible reporting | report scope, generated period, immutable values |

Dedicated configuration collections are separate aggregates: they have independent permissions, validation, version histories, effective dates, and audit trails. They are not embedded in a single `organization_configs` document. References from programs or offerings pin the configuration version used for an operational decision when historical reproducibility is required.

## Ledger Integrity

`credit_ledger_entries` has a unique compound index on `organization_id + idempotency_key`. Its balance is computed as the sum of signed quantities for a membership. Corrections reference the original entry; they never mutate it.

`payment_transactions` use lifecycle states such as Recorded, Settled, Voided, Refunded, and Reversed. A refund is a new transaction referencing the original transaction.
