# Student Archive Lifecycle

## Purpose

Student removal is an archival operation. A Student is never hard-deleted because the Student may be referenced by Memberships, Participations, Attendance, Payments, Allocations, and Credit Ledger history.

## Transactional workflow

When an authorized administrator archives a Student:

1. The Student is marked with `status: archived` and `is_deleted: true`.
2. Every active Membership for that Student is transitioned to `inactive`.
3. Every active Membership Term Participation belonging to those Memberships is transitioned to `withdrawn`.
4. A lifecycle history entry is appended to each changed document.
5. Audit records and Outbox events are written for the Student and every downstream transition.
6. All writes commit in one MongoDB transaction.

The operation is organization-scoped. The organization is taken from the authenticated context for organization users; the existing Student record supplies the target organization for an authorized Super Admin request.

## Preserved history

The archive operation never deletes or updates in place:

- Attendance Records
- Payment Transactions
- Payment Allocations
- Credit Ledger Entries

Corrections to those domains continue to use their own immutable or compensating transaction rules.

Legacy fee records are not deleted as a side effect of Student archival.

## Reconciliation and idempotency

The archive command is safe to repeat. If the Student is already archived and no active Memberships or Participations remain, it returns an already-archived result without creating duplicate lifecycle events.

If an earlier incomplete state left active downstream records behind, a repeat archive reconciles those active records in the same transaction.

After a successful operation, the following invariant must hold within the Student's organization:

- No active Membership belongs to an archived Student.
- No active Participation belongs to an inactive Membership belonging to an archived Student.

## Rollback

If any Student, Membership, Participation, Audit, or Outbox write fails, the MongoDB transaction aborts and none of the lifecycle changes become visible. The operation requires transaction-capable MongoDB infrastructure.

## API behavior

The existing administrator Student removal action remains the HTTP `DELETE /api/students/:id` route for compatibility with the current UI contract, but its behavior is archival. The response reports the Student ID and the number of Memberships and Participations transitioned.
