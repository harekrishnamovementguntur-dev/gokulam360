# PR #14 Migration Readiness Report

## Legacy functionality covered
- Explicit legacy Program to canonical Program Offering mapping
- Auditable source snapshot and mapping ownership
- Canonical Program and Offering lifecycle-ready records

## Legacy functionality remaining
- Legacy Classes & Batches still owns schedule generation, sessions, enrollment, fees, and attendance
- Membership still references legacy program_id
- No Terms, Sessions, Participation, Credits, Payments, or Attendance migration

## Risks
Mappings require administrator review because a legacy Program may represent a batch or term. No automatic mapping is performed.

## Recommendation
PR #15 should add Terms and Sessions beneath Program Offering. The following Membership Term Participation phase can consume the explicit mapping without rewriting Membership history.