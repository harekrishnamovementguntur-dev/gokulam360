# Program and Program Offering Domain — PR #14

## Canonical model

A Program is an organization-scoped reusable academic definition: name, description, age group, lifecycle status, and metadata. It never contains fees, credits, sessions, terms, capacity, dates, teachers, or batch data.

A Program Offering is an organization-scoped delivery of one Program: academic year, cohort, dates, capacity, schedule, lifecycle status, and metadata. Terms and Sessions are deliberately absent.

## Runtime strategy

The current application is a temporary development shell backed by its existing legacy runtime. PR #14 does not add synchronization, dual writes, migration mappings, or compatibility UI. New canonical APIs and the administrator Programs & Offerings screen operate only on canonical collections.

The coordinated application cutover will regenerate demo data using the canonical model and move current consumers to Program Offerings. Until then, the legacy runtime must not be extended with new business capabilities.

## Membership roadmap

Membership remains unchanged in PR #14. PR #16 will introduce Membership Term Participation so participation can reference a canonical Program Offering and Term without rewriting production history.

## Boundaries

Program owns academic definition. Program Offering owns operational delivery. Terms and Sessions will be implemented beneath Program Offering in PR #15.

## Architect's notes

The canonical persistence names are intentionally isolated while the development shell still uses the legacy `programs` shape. This is a temporary implementation boundary, not a second production source of truth. No data synchronization is permitted.
