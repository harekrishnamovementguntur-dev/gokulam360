# ADR-009: Academic Calendar as First-Class Terms and Sessions

## Problem

Future Membership Participation, Attendance, Credits, and reporting require a stable scheduling model. Embedded or legacy class schedules cannot provide independent lifecycle, auditability, regeneration safety, or historical reporting.

## Alternatives considered

1. Keep schedules embedded in legacy classes.
2. Store generated Sessions as mutable arrays under Terms.
3. Introduce independent Term and Session collections with an additive generator.

## Decision

Use `academic_terms`, `academic_sessions`, and `academic_session_generation_runs` as canonical Academic Calendar persistence. Terms belong to Program Offerings; Sessions belong to Terms. The generator is preview-first, idempotent, and additive.

Session numbers are server-assigned and immutable. Session ownership is explicit through `source`, and any administrator edit changes the source to `manual`.

## Consequences

- Future domains can reference stable Session identifiers.
- Regeneration cannot overwrite manual or lifecycle changes.
- Generation history supports audit and troubleshooting.
- The system temporarily contains legacy scheduling code in the development shell until coordinated cutover.
- Teacher assignment remains a future relationship rather than a field added prematurely.
