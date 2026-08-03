# Development Database Reset

This operation is for a dedicated development or Preview database only. It is not called by application startup, deployment, or production code.

## Safety gates

All of the following are required:

- `NODE_ENV` and `VERCEL_ENV` must not be `production`.
- `ALLOW_DEVELOPMENT_RESET=true`.
- `DEVELOPMENT_RESET_CONFIRM=reset-gokulam360-v1`.
- `RESET_DB_NAME` must match `gokulam360_*` and must differ from `DB_NAME`.
- `BOOTSTRAP_SUPER_ADMIN_EMAIL` must identify an existing user with role `super_admin` and no `organization_id`.
- MongoDB must support transactions.

The script refuses to proceed if the bootstrap Super Admin cannot be found.

## What is removed

All documents in every collection in the selected reset database are removed, except:

- The bootstrap Super Admin user.
- Existing documents in `system_config`, `system_settings`, or `configuration` collections.

Organizations, members, memberships, programs, offerings, terms, sessions, participations, payments, ledger entries, attendance, audit logs, outbox events, and other demo data are removed. Collections and indexes are retained.

## Run

PowerShell example:

```powershell
$env:ALLOW_DEVELOPMENT_RESET='true'
$env:DEVELOPMENT_RESET_CONFIRM='reset-gokulam360-v1'
$env:RESET_DB_NAME='gokulam360_ui_freeze'
$env:BOOTSTRAP_SUPER_ADMIN_EMAIL='super@gokulam360.com'
yarn db:reset:development
```

Do not set `RESET_DB_NAME` to the production database or to the ordinary application database.

## Expected first-run experience

1. Super Admin signs in.
2. No organizations exist.
3. Super Admin creates the first Organization.
4. Super Admin creates the first Organization Administrator.
5. Organization Administrator signs in and completes the remaining setup.

The reset output reports the selected database, removed document counts, and preserved records. It does not print passwords or tokens.
