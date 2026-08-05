# Gokulam360 V2 Rebuild Boundary

## Purpose

Gokulam360 V2 is a simpler temple operations application built around the daily work of administrators, teachers, finance users, students, and parents.

The rebuild changes the experience, not the integrity of the canonical backend.

## First-run experience

1. Bootstrap Super Admin signs in.
2. No organization exists.
3. Super Admin creates the first organization and Organization Administrator.
4. Organization Administrator sets up classes and terms.
5. The administrator enrolls students, collects payments, and records attendance from task-oriented screens.

## Administrator daily tasks

The primary experience will be:

- Enroll a student
- Manage classes
- Take today's attendance
- Collect a payment
- Follow up with absentees
- Review low-credit and pending-payment alerts
- Ask the assistant questions in plain language

Technical entities such as Membership, Participation, Credit Ledger, and Attendance Policy remain available to the system but are not required knowledge for routine work.

## Canonical backend boundary

The rebuild must continue using the existing canonical domains:

- Students and Members
- Memberships
- Program Offerings
- Academic Terms and Sessions
- Membership Term Participations
- Payments and Allocations
- Credit Ledger
- Attendance
- Reporting
- Audit and Outbox

No destructive replacement of financial, attendance, or audit history is allowed.

## Development data reset

The development database may be reset only through:

```powershell
$env:NODE_ENV = "development"
$env:VERCEL_ENV = "preview"
$env:DB_NAME = "gokulam360"
$env:ALLOW_DEVELOPMENT_RESET = "true"
$env:DEVELOPMENT_RESET_CONFIRM = "reset-gokulam360-v1"
$env:BOOTSTRAP_SUPER_ADMIN_EMAIL = "..."
yarn db:reset:development
```

The reset script must continue to:

- refuse `NODE_ENV=production`;
- refuse `VERCEL_ENV=production`;
- require `ALLOW_DEVELOPMENT_RESET=true`;
- require the exact confirmation string;
- require the bootstrap Super Admin;
- preserve the bootstrap Super Admin and system configuration;
- remove all other development/demo collections transactionally.

This procedure has not been executed from the connected repository environment because no MongoDB credentials are available there. It must be run only against the confirmed development/Preview database.

## Rebuild sequence

1. Clean task-oriented Administrator shell.
2. One-page admission and payment collection.
3. Student Workspace with credits, attendance, payments, history, and QR.
4. Today's Attendance with absent follow-up.
5. Parent QR experience and featured announcements.
6. Plain-language Reports and Assistant.
7. Role-specific teacher, finance, and Super Admin polish.
8. Production verification, security review, backup/restore verification, and release sign-off.

## Non-goals

- No new parallel domain model.
- No dual writes.
- No destructive financial deletion.
- No production database reset.
- No AI answers that bypass organization authorization.
