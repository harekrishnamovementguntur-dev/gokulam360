# Gokulam360 v1.0 Release Checklist

Use this checklist for each release candidate and retain the completed copy with the release record. Every checked item should have evidence recorded in the release notes or deployment ticket.

Release version:  
Release commit:  
Environment:  
Release date:  
Release owner:  

## Infrastructure checklist

- [ ] Production hosting project and deployment target are confirmed.
- [ ] Node.js 20 LTS runtime is selected.
- [ ] Yarn 1.22.22 is available for the build.
- [ ] Production MongoDB is an approved transaction-capable deployment.
- [ ] MongoDB network access is restricted to approved application infrastructure.
- [ ] Production database name and organization scope are confirmed.
- [ ] DNS and HTTPS certificates are active.
- [ ] Vercel or hosting quotas, regions, and concurrency limits are reviewed.
- [ ] Centralized application, hosting, and database logs are retained.
- [ ] Alert recipients and operational ownership are documented.

## Security checklist

- [ ] `MONGO_URL` is configured only in the deployment platform's protected environment.
- [ ] `DB_NAME` is configured for the intended production database.
- [ ] `JWT_SECRET` is high-entropy, unique to production, and not present in source control.
- [ ] Optional integration secrets are configured only when required.
- [ ] Super Admin accounts are limited to named platform operators.
- [ ] Organization Administrator access is assigned to the correct organization.
- [ ] Tenant-scoped operations derive organization context from authenticated authorization.
- [ ] Super Admin tenant-scoped operations use an explicit target organization.
- [ ] HTTPS-only access is enforced.
- [ ] Security response headers are present and reviewed.
- [ ] Edge/WAF rate limiting is enabled for login and other exposed abuse-sensitive routes.
- [ ] Application-level login rate-limit settings are reviewed.
- [ ] No passwords, tokens, cookies, API keys, or payment secrets appear in logs.
- [ ] Access to Vercel, GitHub, MongoDB, backups, and monitoring is least-privilege.
- [ ] Dependency and secret scanning results have been reviewed.

## Deployment checklist

- [ ] The release branch and exact commit SHA are approved.
- [ ] All required checks are successful.
- [ ] The Vercel Preview was built from the intended commit.
- [ ] Production environment variables were verified before deployment.
- [ ] Deployment logs contain no unresolved build or runtime errors.
- [ ] `GET /api/health` returns HTTP 200.
- [ ] `GET /api/ready` returns HTTP 200.
- [ ] Security headers were checked on the deployed HTTPS response.
- [ ] The production deployment URL and commit SHA are recorded.
- [ ] Release communications and support contacts are ready.
- [ ] The previous known-good deployment is identified for rollback.

## Smoke test checklist

Perform these checks with a dedicated test Administrator account and representative pilot data.

- [ ] Administrator login succeeds.
- [ ] Session remains valid while navigating between modules.
- [ ] Dashboard loads without uncaught errors.
- [ ] Programs and Program Offerings load.
- [ ] Academic Terms and Sessions load.
- [ ] Members, Memberships, and Term Participations load.
- [ ] A read-only Payments workflow loads.
- [ ] Credit Ledger balances are displayed from ledger entries.
- [ ] Attendance workflow loads and canonical records are visible.
- [ ] Reports load with organization-scoped data.
- [ ] A controlled canonical write is tested where release policy permits.
- [ ] Browser console has no unexpected errors.
- [ ] Network inspection shows no unexpected failed requests.
- [ ] No administrator workflow calls intentionally retired legacy operational endpoints.
- [ ] Parent/QR routes are smoke-tested when included in the release scope.
- [ ] Test account credentials and test records are not left exposed.

## Backup verification checklist

- [ ] A current canonical backup exists before release.
- [ ] Backup storage is encrypted and access-controlled.
- [ ] Backup retention and off-site copy policy are active.
- [ ] Backup includes organizations and all canonical collections:
  - [ ] Members/source student records
  - [ ] Programs and Program Offerings
  - [ ] Academic Terms and Sessions
  - [ ] Memberships and Membership Term Participations
  - [ ] Payment Transactions and Allocations
  - [ ] Credit Ledger Entries
  - [ ] Attendance Records
  - [ ] Audit Logs and Outbox Events
- [ ] Obsolete legacy collections are excluded unless an approved migration requirement exists.
- [ ] A backup was restored to an isolated transaction-capable database.
- [ ] Restored counts and representative relationships were compared.
- [ ] Audit and Outbox records were preserved by the restore procedure.
- [ ] An intentionally invalid restore was rejected without partial state.
- [ ] Restore evidence and the backup identifier are recorded.
- [ ] The procedure in `docs/operations/CANONICAL_BACKUP_RESTORE.md` was followed.

## Rollback checklist

- [ ] Rollback owner and decision authority are identified.
- [ ] The last known-good deployment URL and commit are available.
- [ ] Rollback does not modify database contents.
- [ ] New writes and background operations are assessed before rollback.
- [ ] Hosting rollback is completed and its result is recorded.
- [ ] `/api/health` and `/api/ready` pass after rollback.
- [ ] Login and critical read workflows pass after rollback.
- [ ] Any incompatible data or index change is documented before resuming writes.
- [ ] Users and stakeholders are notified of the rollback and current status.
- [ ] A follow-up incident or corrective-action record is opened when required.

## Release sign-off checklist

- [ ] Product owner approves the release scope.
- [ ] Engineering reviewer approves the release commit.
- [ ] Security reviewer approves the security checklist.
- [ ] Operations owner approves infrastructure, monitoring, and rollback readiness.
- [ ] Backup/restore evidence is attached.
- [ ] Smoke-test evidence is attached.
- [ ] Known limitations and deferred validations are recorded.
- [ ] No Critical or High release blockers remain open.
- [ ] Support/admin communication is complete.
- [ ] Release decision: **Go / No-Go**
- [ ] Product owner name and date:  
- [ ] Engineering owner name and date:  
- [ ] Security/operations owner name and date:  
- [ ] Final release notes link:  
