# Production Deployment Runbook

This document describes the minimum operational procedure for deploying Gokulam360 v1.0. It is intentionally limited to deployment, configuration, verification, and recovery; it does not change domain behavior.

## Runtime baseline

- Node.js: 20 LTS.
- Package manager: Yarn 1.22.22.
- Build command: `yarn build`.
- Start command: `yarn start`.
- Hosting: Vercel or an equivalent platform that supports Next.js standalone output.
- Database: MongoDB Atlas or another transaction-capable MongoDB deployment. Financial, Attendance, and restore workflows require replica-set or sharded-cluster transaction support.

## Required environment variables

Configure these in the deployment platform, separately for Preview and Production:

- `MONGO_URL`: MongoDB connection string.
- `DB_NAME`: database name.
- `JWT_SECRET`: high-entropy secret used to sign authentication tokens.

Never commit values for these variables. Do not reuse a production `JWT_SECRET` in development or Preview.

Optional integrations are documented in `LOCAL_DEVELOPMENT.md` and should be configured only when the corresponding feature is enabled:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM_NUMBER`
- `TWILIO_WHATSAPP_FROM`

## Deployment procedure

1. Confirm the target branch and commit in the Vercel deployment.
2. Confirm Preview/Production environment variables are present before the build starts.
3. Review the Vercel build output for dependency, compilation, and route errors.
4. After deployment, call `GET /api/health` for liveness.
5. Call `GET /api/ready` for dependency readiness. A 200 response requires configuration and MongoDB connectivity; a 503 response must not receive production traffic.
6. Log in with a dedicated administrator account.
7. Smoke-test one read workflow and one write workflow from the Administrator application.
8. Confirm no unexpected browser console errors or failed API requests.
9. Record the deployed commit, verification time, and verifier in the release record.

## Rollback

- Use Vercel's deployment rollback to the last known-good deployment.
- Do not roll back by changing database contents.
- If a schema or index issue is suspected, stop writes and inspect the deployment logs before retrying.
- After rollback, repeat `/api/health`, `/api/ready`, login, and the release smoke test.

## Monitoring and evidence

Retain:

- Vercel deployment URL and commit SHA.
- Build logs and runtime errors.
- Readiness responses.
- Release smoke-test results.
- MongoDB backup/restore verification evidence.

The structured logger emits JSON lines with timestamp, service, level, event, and redacted error metadata. Do not place credentials, tokens, or request bodies containing secrets in logs.

## Backup prerequisite

Before the first temple deployment, complete the procedure in `docs/operations/CANONICAL_BACKUP_RESTORE.md` against an isolated transaction-capable database and confirm that the backup can be restored without partial state.

## Known operational limitations

- `/api/health` is the existing liveness route in the catch-all API handler.
- `/api/ready` is the dependency readiness route introduced by the operational foundation.
- Distributed rate limiting and centralized log retention require platform infrastructure; they are tracked separately from this foundation PR.
