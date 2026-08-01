# Attendance Development Demo Seed

This fixture is for local or disposable development databases only. It is not invoked by the application and does not alter production startup or runtime behavior.

## Fixture contents

The seed creates, using deterministic IDs:

- 1 Organization
- 1 canonical Program (required by the Program Offering relationship)
- 1 canonical Program Offering
- 1 Term
- 3 canonical Sessions
- 5 Students
- 5 active Memberships
- 5 active Membership Term Participations

The Program Offering enables one credit per Present/Late Attendance so the Attendance and Credit Ledger behavior can be exercised.

## Preconditions

Use a disposable development MongoDB database with transaction support. Do not use production credentials or a production database.

The script refuses to run when:

- `NODE_ENV=production`
- `ALLOW_DEMO_SEED` is not `true`
- `ATTENDANCE_DEMO_SEED_CONFIRM` is not `attendance-demo-v1`

## Run

PowerShell:

```powershell
$env:ALLOW_DEMO_SEED="true"
$env:ATTENDANCE_DEMO_SEED_CONFIRM="attendance-demo-v1"
yarn seed:attendance
```

Unix shell:

```bash
ALLOW_DEMO_SEED=true ATTENDANCE_DEMO_SEED_CONFIRM=attendance-demo-v1 yarn seed:attendance
```

The script reads `MONGO_URL` and `DB_NAME` from the environment. It prints the deterministic Organization, Program Offering, Term, and record IDs after completion.

## Re-running safely

The fixture uses deterministic IDs and a `demo_seed_key` marker. Re-running the command is idempotent: it creates missing fixture documents and leaves existing fixture documents unchanged. It does not delete Attendance Records, Ledger Entries, Audit Logs, or Outbox Events created during verification.

Because the seed is intentionally non-destructive, reset the disposable database itself if a completely clean verification run is required.

## Verification login

Authenticate with an administrator whose `organization_id` is the seeded Organization ID:

```
demo-attendance-organization
```

The seeded records will not appear to an administrator from a different organization. This is intentional and also supports organization-isolation testing.
