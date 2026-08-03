# Production Security Controls

This document records the security controls introduced by the production-readiness workstream. It does not change domain authorization or business rules.

## Runtime configuration

Required variables are validated before the API runtime starts:

- `MONGO_URL`
- `JWT_SECRET`

Use separate, high-entropy values for Development, Preview, and Production. Rotate `JWT_SECRET` through a planned deployment because rotating it invalidates existing tokens.

Optional login guardrail configuration:

- `AUTH_RATE_LIMIT_WINDOW_MS` — default: 60000.
- `AUTH_RATE_LIMIT_MAX_REQUESTS` — default: 10 per IP/email key per process window.

## Response headers

The application sends:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, and geolocation by default.
- `Strict-Transport-Security` for HTTPS deployments.
- Existing frame-ancestor Content Security Policy.

Review these headers after any hosting or embedding change.

## Login rate limiting

The application applies a bounded per-process guardrail to login attempts and returns HTTP 429 with `Retry-After` when the threshold is exceeded.

Because Vercel/serverless instances do not share memory, this is not a complete distributed abuse-prevention system. Before exposing the application broadly, configure an edge/WAF or shared rate-limit provider keyed by source IP and account identifier. The application guardrail remains useful as defense in depth.

## Data handling

- Never log passwords, JWTs, cookies, API keys, or full payment details.
- Keep Organization authorization derived from the authenticated context.
- Super Admin tenant-scoped operations require an explicit target organization.
- Use HTTPS-only production URLs.
- Restrict MongoDB network access to approved application infrastructure.

## Release checks

Before production traffic:

1. Confirm required variables are configured in the Production environment.
2. Confirm `/api/ready` returns 200.
3. Confirm security headers on the deployed HTTPS response.
4. Confirm failed login attempts receive a bounded 429 response after the configured threshold.
5. Confirm centralized edge/WAF rate limiting is enabled.
6. Confirm Vercel access and MongoDB audit logs are retained.
