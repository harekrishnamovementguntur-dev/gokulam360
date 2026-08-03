# Pilot Demo Seed

The Pilot Demo Seed creates deterministic, internally consistent data for exercising the canonical Administrator workflows.

## Safety

This script:

- refuses to run when `NODE_ENV=production` or `VERCEL_ENV=production`;
- requires `ALLOW_PILOT_DEMO_SEED=true`;
- requires `PILOT_DEMO_SEED_CONFIRM=pilot-demo-v1`;
- requires `PILOT_DEMO_DB_NAME` beginning with `gokulam360_pilot`;
- never uses the ordinary `DB_NAME` value.

Use only a dedicated development or preview database.

## Contents

- One Organization and Organization Admin
- One canonical Program
- One Program Offering
- One Academic Term
- Three Sessions
- Five Students/Members
- Five active Memberships
- Five active Membership Term Participations
- One posted Payment Transaction
- One draft Payment Transaction
- One posted Payment Allocation
- Credit Ledger entries for payment credit purchase and attendance consumption
- Present, Late, Absent, and Excused Attendance Records
- Representative Audit Logs and Outbox Events

## Usage

From a configured development checkout:

```powershell
$env:ALLOW_PILOT_DEMO_SEED='true'
$env:PILOT_DEMO_SEED_CONFIRM='pilot-demo-v1'
$env:PILOT_DEMO_DB_NAME='gokulam360_pilot_dev'
yarn seed:pilot-demo
```

The script uses the existing `MONGO_URL`. It prints the seeded Organization Admin credentials after completion.

## Idempotency

All fixture IDs are deterministic and namespaced with `pilot-demo`. Re-running the script replaces only records carrying the `demo_seed_key: pilot-demo-v1` marker in the dedicated pilot database.

The script is not invoked by the application, Vercel build, or production startup.
