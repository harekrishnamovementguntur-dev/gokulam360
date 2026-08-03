# Canonical Backup & Restore

This procedure backs up and restores the canonical Gokulam360 data model. Legacy collections are intentionally excluded.

## Contents

Organization metadata, Students/Members source records, Academic Programs, Program Offerings, Academic Terms, Academic Sessions, Memberships, Membership Term Participations, Payment Transactions, Payment Allocations, Credit Ledger Entries, Canonical Attendance Records, Audit Logs, and Outbox Events.

Authentication secrets and user password hashes are not exported. Re-provision administrator accounts separately during disaster recovery.

## Export

Use an authenticated Organization Administrator session to call `GET /api/backup/export`. A Super Admin must provide an explicit `organization_id`. Store the versioned JSON in encrypted, access-controlled storage.

## Restore

Use a disposable restore database backed by a MongoDB replica set or sharded cluster. Submit the unmodified payload to `POST /api/backup/restore`. Organization Administrators restore their own organization; Super Admins must include `organization_id` in the body.

Restore replaces the target organization's canonical collections in one MongoDB transaction and records `backup.restored` in Audit Logs and Outbox Events. Validation or transaction failure aborts the restore.

## Verification

Export a known pilot organization, restore it to an isolated database, compare collection counts, verify Membership, Participation, Payment, Ledger, Attendance, Audit, and Outbox relationships, then force a validation failure and confirm no changes are visible.

## Safety and limitations

- Never experiment against production.
- Legacy backup payloads are rejected rather than silently converted.
- Encrypt backups and restrict access.
- Authentication users/secrets are not restored.
- Indexes are created by application initialization and are not serialized.
- Scheduled off-site retention remains an operations responsibility.
