# Final Legacy Operational Cutover

## Scope

This cutover removes Administrator-reachable Enrollment and Fee operations while preserving Parent/QR-specific legacy paths outside this PR.

## Behavior

- Student create/update writes only the Student record and canonical Memberships through the Membership API.
- Participation remains a separate canonical operation because the Student form does not choose a Program Offering and Academic Term; administrators use Membership Participation management for that relationship.
- Dashboard financial values are derived from Payment Transactions and Credit Ledger entries.
- Notifications use active Memberships and Membership Term Participations.
- Administrator access to /api/enrollments returns HTTP 410.
- The legacy /api/fees collection route is no longer registered.
- Parent/QR routes are intentionally unchanged.

## Verification

- Run yarn test:legacy-cutover.
- Verify Student create/edit with selected programs creates no enrollments or fees records.
- Verify canonical Membership creation is visible in Memberships.
- Verify Dashboard payment/credit values.
- Verify Notifications loads active Participation-based recipients.
- Verify Administrator calls to /api/enrollments return 410 and /api/fees returns 404.
- Verify Parent/QR workflows remain unchanged.

## Rollback

Revert the PR commit(s). This restores the previous Administrator legacy paths without changing canonical records. Do not re-enable both legacy and canonical writes simultaneously during rollback; use the prior release consistently.
