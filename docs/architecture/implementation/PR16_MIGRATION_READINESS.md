# PR #16 Migration and Verification Notes

## Covered

- Canonical Membership Term Participation collection.
- Organization-scoped APIs and lifecycle commands.
- Administrator list, filter, create, details, archive, restore, complete, and withdraw UI.
- Immutable relationship validation.
- Audit and transactional outbox writes.

## Deferred

The preview environment may not provide a second-organization fixture or a read-only database surface for directly observing audit_logs and outbox_events. These checks must be completed in integrated testing before production onboarding.

## Future dependency

PR #17 may build Credit Ledger and Payments against Membership. Attendance will later reference both Session and Membership Term Participation.
