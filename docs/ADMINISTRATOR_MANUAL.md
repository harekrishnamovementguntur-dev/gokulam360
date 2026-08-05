# Gokulam360 Administrator Manual

This manual covers the supported Administrator workflows in Gokulam360 v1.0. It is written for temple and school administrators and intentionally avoids implementation details.

## Sign in safely

1. Open the deployment URL supplied by your organization.
2. Sign in with your assigned Administrator account.
3. Never share an account or store a password in a spreadsheet or chat.
4. Sign out on shared devices.
5. Report unexpected login failures, missing data, or unauthorized records to the platform owner.

Super Admin accounts are platform-scoped. Organization Administrators operate only within their assigned organization. A Super Admin must explicitly select a target organization for tenant-scoped operations.

## Daily workflow

### 1. Review the Dashboard

Use the Dashboard for the day's operational view:

- Upcoming sessions.
- Attendance summaries.
- Pending financial items.
- Recent activity.

Treat dashboard values as summaries. Open the relevant canonical module when a record needs correction or detailed review.

### 2. Manage Programs and Offerings

- Create or update the reusable academic Program.
- Create a Program Offering for the actual academic delivery, cohort, schedule, and dates.
- Use the Offering when working with Terms and Sessions.
- Do not use a Program as a substitute for a dated Offering.

### 3. Manage Terms and Sessions

- Create a Term under a Program Offering.
- Generate Sessions using the schedule wizard.
- Review the preview before generating.
- Confirm holidays and excluded dates.
- Use Session lifecycle actions for cancellation or rescheduling.
- Do not overwrite manually modified Sessions during regeneration.

### 4. Manage Members and Memberships

- Create or update the Member identity record.
- Confirm the expected Membership exists.
- Archive records only when the relationship is no longer active; do not delete historical business records.
- Review the Membership history before making a lifecycle change.

### 5. Manage Term Participation

- Select the Membership, Program Offering, and Academic Term.
- Create a Participation only when the Membership and relationship chain are valid.
- Use lifecycle actions such as Activate, Complete, Withdraw, Archive, and Restore as appropriate.
- A Participation is the canonical relationship used by Attendance and future progress workflows.

### 6. Record Attendance

- Select Program Offering, Term, and Session.
- Confirm the active Participation roster.
- Record Present, Late, Absent, or Excused.
- Use the explicit correction action when an existing record must be changed.
- Corrections preserve history and may create compensating Credit Ledger entries according to the configured policy.
- Holiday and Cancelled Sessions do not accept normal attendance mutations.

### 7. Manage Payments and Credits

- Create a Payment Transaction with the appropriate receipt information.
- Allocate only to the intended Membership or memberships.
- Post a Payment only after reviewing allocations.
- Credits are granted only when a Payment is posted.
- Use refunds or compensating transactions for corrections; do not edit posted allocations or ledger entries.
- Review the calculated Credit Ledger balance rather than expecting a manually edited balance.

### 8. Review Reports

Use canonical Reports for Members, Memberships, Payments, Credit Ledger, and Attendance. Apply filters before exporting the current page. Validate the organization and date range before sharing a CSV.

## Safe correction practices

- Prefer lifecycle actions to deletion.
- Correct Attendance through the correction workflow.
- Correct posted financial activity through refunds or compensating transactions.
- Preserve receipt numbers and source references.
- If a result looks wrong, stop and record the affected ID and timestamp before retrying.

## Operational checks

Before a pilot release, the platform owner should confirm:

- `GET /api/health` returns liveness.
- `GET /api/ready` returns readiness.
- Vercel deployment commit and environment are correct.
- MongoDB backups are current and a restore drill has passed.
- Browser smoke tests pass with no unexpected console or network errors.

## Support information to capture

When reporting an issue, include:

- Organization name.
- Module and screen.
- Approximate time.
- Record ID or receipt number, if visible.
- Action attempted.
- Exact user-facing message.
- Screenshot only when it does not expose credentials or sensitive personal information.

Never include passwords, JWTs, API keys, or full payment details in a support request.
