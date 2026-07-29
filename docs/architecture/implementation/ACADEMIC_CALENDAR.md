# Academic Calendar — PR #15

## Purpose

The Academic Calendar bounded context provides canonical Terms and Sessions beneath Program Offerings. It is independent from Attendance, Credits, Payments, and Membership Term Participation.

## Domain

```
Program Offering
  └── Term
        └── Session
```

Terms own academic date ranges and display order. Sessions are first-class records and are never embedded in Terms.

## Session ownership

Every Session has a `source`:

- `generated`: created by the generation service.
- `manual`: created or modified by an administrator.

Session numbers are assigned by the server and are immutable. Any update to a Session makes its source `manual`.

Regeneration is additive. It creates only missing dates and preserves existing generated, manual, cancelled, rescheduled, holiday, and archived Sessions.

## Generation workflow

The administrator uses:

1. Weekdays
2. Time and date range
3. Excluded dates and holiday dates with reasons
4. Preview
5. Generate

The preview reports dates to create, existing Sessions to preserve, excluded dates, holidays, and reasons before any write occurs.

Generation runs are recorded in `academic_session_generation_runs` with configuration and created/preserved counts.

## Statuses

Terms: `draft`, `active`, `inactive`, `archived`.

Sessions: `scheduled`, `completed`, `cancelled`, `rescheduled`, `holiday`, `archived`.

The status model is designed for future reporting. Attendance and completion workflows are intentionally out of scope for PR #15.

## Backward compatibility

The existing development shell remains unchanged. PR #15 introduces canonical Academic Calendar APIs and UI without modifying legacy Classes, Attendance, Fees, or Membership behavior.

## Limitations

- Attendance does not consume or update Sessions in this PR.
- Teacher assignment is not implemented; Session fields remain extensible for a future assignment relationship.
