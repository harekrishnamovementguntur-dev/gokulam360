# Program and Program Offering Domain — PR #14

## Canonical model
A Program is an organization-scoped reusable academic definition: name, description, age group, lifecycle status, and metadata. It never contains fees, credits, sessions, terms, capacity, dates, teachers, or batch data.

A Program Offering is an organization-scoped delivery of one Program: academic year, cohort, dates, capacity, schedule, lifecycle status, and metadata. Terms and Sessions are deliberately absent.

## Legacy bridge
Legacy `programs` records are untouched. An explicit `migration_mappings` record of type `legacy_program_to_program_offering` stores the legacy record snapshot and target Program/Offering references. Mapping is administrator initiated and audited; normal legacy operation never runs hidden conversion logic.

## Membership migration path
Memberships continue to use their existing legacy `program_id`. The mapping identifies the future canonical Program Offering but does not alter Membership records. PR #15/16 will introduce Terms and Membership Term Participation; that participation will carry the canonical Offering reference, preserving the original Membership history.

## Backward compatibility
Classes & Batches, Enrollments, Fees, Attendance, imports, backups, and the parent portal continue to use legacy `programs` unchanged. Canonical APIs are additive under `/api/academic-programs`, `/api/program-offerings`, and `/api/migration-mappings`.

## Architect's notes
The reusable `migration_mappings` persistence shape is intentionally narrow. Future mapping types may reuse it, but generic workflow, execution, and rollback engines are out of scope.