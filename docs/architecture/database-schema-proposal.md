# Database Schema Proposal

## Conventions

Every tenant record includes `id`, `organization_id`, `status`, `created_at`, `created_by`, `updated_at`, and version/audit metadata where appropriate. Financial, credit, attendance, audit, and outbox records are append-only. MongoDB indexes always begin with `organization_id` for tenant-owned collections.

## Core Collections

| Collection | Purpose | Important fields / indexes |
|---|---|---|
| organizations | Tenant root and branding | `id`, lifecycle, currency, configuration references |
| organization_configs | Versioned tenant configuration | academic, attendance, credit, content, notification, permission settings |
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
| payment_allocations | Links payment to memberships | payment, membership, amount, credits granted |
| achievements | Membership accomplishments | type, evidence, issuer, dates |
| content_items | Generic managed content | type, body, assets, publish window, priority, lifecycle |
| content_targets | Content audience scope | content, program/offering, term, membership status, age group |
| audit_logs | Security and business audit | actor, entity, action, before/after summary |
| outbox_events | Reliable domain-event delivery | event type, aggregate, payload, status, idempotency |
| report_snapshots | Reproducible reporting | report scope, generated period, immutable values |

## Ledger Integrity

`credit_ledger_entries` has a unique compound index on `organization_id + idempotency_key`. Its balance is computed as the sum of signed quantities for a membership. Corrections reference the original entry; they never mutate it.

`payment_transactions` use lifecycle states such as Recorded, Settled, Voided, Refunded, and Reversed. A refund is a new transaction referencing the original transaction.
