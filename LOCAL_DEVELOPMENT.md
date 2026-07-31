# Local Development

This document describes the recommended local workflow for Gokulam360 and the development checks needed before PR #17A can be considered merge-ready.

## Prerequisites

- Node.js 20 LTS is recommended. Next.js 15 requires Node.js 18.18 or newer.
- Yarn 1.22.22, matching the `packageManager` field in `package.json`.
- The `yarn dev` script uses `cross-env`, so the same command works in Windows PowerShell/cmd and Unix shells.
- A MongoDB development database with transaction support.
- Git and a checkout of the exact branch or commit being tested.
- A browser for the administrator UI.

Do not use production credentials or production data for local development.

## MongoDB requirement

Credit Ledger writes are intentionally atomic. The manual adjustment command writes the ledger entry, audit log, outbox event, and idempotency receipt in one MongoDB transaction.

MongoDB transactions require a replica set or a sharded cluster accessed through `mongos`. A standalone `mongod` does not support the transaction path and must not be used for Credit Ledger verification.

Suitable options:

- A disposable MongoDB Atlas development cluster.
- A local single-node replica set, for example a `mongod` started with `--replSet rs0`, followed by `rs.initiate()`.
- A Docker MongoDB replica-set setup.

The application deliberately does not fall back to non-atomic writes when transactions are unavailable.

## Environment variables

Create `.env.local` at the repository root. Never commit it.

Required by the server runtime:

```
MONGO_URL=mongodb://127.0.0.1:27017/?replicaSet=rs0
DB_NAME=gokulam360_dev
JWT_SECRET=replace-with-a-long-local-only-secret
```

For Atlas, use the Atlas connection string in `MONGO_URL`, including the database name or keep `DB_NAME` explicit.

Development-only seed and URL settings documented by the existing project configuration:

```
ALLOW_DEMO_SEED=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

`ALLOW_DEMO_SEED=true` must be used only with a disposable development database and must never be enabled in production.

Optional integrations should remain unset unless they are being tested. If enabled, configure their documented provider credentials through environment variables rather than hardcoding secrets.

The current server code requires `MONGO_URL`, `DB_NAME` defaults to `gokulam360` when omitted, and `JWT_SECRET`. The local setup should still define `DB_NAME` explicitly to prevent accidental use of an unintended database.

## Installation

```bash
git clone <repository-url>
cd gokulam360
git checkout <branch-or-commit-under-test>
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile
```

Confirm the checkout before testing:

```bash
git status --short --branch
git rev-parse HEAD
```

## Start the application

```bash
yarn dev
```

The application is available at:

```
http://localhost:3000
```

Use the development seed endpoint only when the local database is disposable:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Test commands

Available domain tests:

```bash
yarn test:membership
yarn test:program
yarn test:calendar
```

The PR #17A Credit Ledger domain test can currently be run directly:

```bash
node --test test/credit-ledger-domain.test.mjs
```

Build verification:

```bash
yarn build
```

Before a financial workflow test, verify that the application is connected to the intended replica-set database and that the test fixture belongs to the current organization.

## PR #17A local verification checklist

With a clean development database and an authenticated administrator:

1. Retrieve the Credit Ledger and select a Membership.
2. Post a positive manual adjustment.
3. Post a negative manual adjustment.
4. Confirm the calculated and running balances equal the ordered sum of immutable ledger entries.
5. Replay the same POST with the same `Idempotency-Key`; confirm no second ledger entry is created.
6. Force a failure after the ledger insert in a test-only harness; confirm the transaction rolls back the ledger entry, audit log, outbox event, and receipt together.
7. Inspect `audit_logs` and `outbox_events` for the committed command.
8. Verify unauthorized roles receive 401/403 and cannot post.
9. Verify a Membership from another organization is rejected and cannot be read or changed.

These checks require a real MongoDB transaction-capable environment; a static build or standalone MongoDB instance is insufficient.

## Troubleshooting

### Transactions unavailable

If the API reports that transactions are unavailable, check:

- `MONGO_URL` points to a replica set or Atlas cluster.
- A local replica set has been initiated.
- The connection string includes the correct `replicaSet` option when required.
- The MongoDB user has permission to write all required collections.

### Authentication failures

Check that:

- `JWT_SECRET` is set consistently for the server.
- The browser is using a token issued by the local server.
- The selected user has the required role.

### Missing Memberships

Confirm that:

- The fixture was created in the same organization as the authenticated user.
- The Membership is active where the workflow requires it.
- The browser is pointed at `http://localhost:3000`, not a preview deployment.

### Port already in use

Run the development server on another port:

```bash
yarn next dev --hostname 0.0.0.0 --port 3001
```

Update `NEXT_PUBLIC_BASE_URL` if the workflow depends on the application URL.

## CI checks to add

The repository currently has build and domain-test commands but no complete CI gate. A future GitHub Actions workflow should run:

- Dependency installation with the lockfile.
- Build.
- Lint (a `lint` script and project lint configuration need to be added).
- Membership, Program, Academic Calendar, and Credit Ledger domain tests.
- API/integration tests against a transaction-capable MongoDB replica set.
- A focused financial integrity suite covering idempotency, rollback, audit, outbox, authorization, and organization isolation.

Vercel should remain the final deployment smoke check, not the primary place where financial correctness is discovered.
