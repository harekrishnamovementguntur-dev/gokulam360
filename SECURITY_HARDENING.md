# Security Hardening

This PR hardens the current Gokulam360 backend without changing the Administrator UI, business workflows, or production data.

## Changes

- Revalidate authenticated sessions against the current user and organization on every protected request.
- Reject client attempts to assign server-owned identity, tenant, role, lifecycle, timestamp, or credential fields through generic collection writes.
- Remove credential and OTP material from API serialization.
- Require an explicit confirmation value for the development-only demo seed endpoint in addition to its existing non-production and feature flags.
- Preserve existing organization scoping and role authorization.

## Required environment safeguards

- Set a strong, private `JWT_SECRET`; never use a fallback value.
- Keep `ALLOW_DEMO_SEED` disabled outside development and set `DEMO_SEED_CONFIRM=reset-gokulam360-demo` only for an isolated development database.
- Use least-privilege MongoDB credentials and separate development, preview, and production databases.
- Configure durable platform/WAF rate limiting for login, password recovery, OTP, public QR, and bulk endpoints; the application process is serverless and in-memory throttling is not a production-wide control.
- Test backup restore into a disposable database before relying on it operationally.

## Verification

- JavaScript syntax checks passed for the changed route.
- Production build passed on the current branch with a temporary validation-only `JWT_SECRET`.
- No database connection, seed, restore, or production mutation was performed.
