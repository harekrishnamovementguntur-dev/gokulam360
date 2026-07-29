# ADR-008: Canonical Program and Program Offering Legacy Bridge

## Problem
The legacy `programs` collection combines academic definition, delivery schedule, generated sessions, capacity, and fees. Reusing it as the canonical Program would violate BR-010 and break existing routes.

## Decision
Canonical Programs are stored in `academic_programs`; deliveries are stored in `program_offerings`. The temporary storage/API names avoid collision with legacy `programs` and `/api/programs`. The canonical UI and domain language remain Program and Program Offering.

A lightweight `migration_mappings` collection provides typed, auditable mappings. PR #14 implements only `legacy_program_to_program_offering`; it is not a generic migration engine.

## Consequences
Legacy behaviour remains unchanged. The bridge is explicit and removable. Membership continues referencing legacy `program_id` until Membership Term Participation connects it to an Offering in a later phase.