# Admission Workflow

The administrator uses one Admission form. The form hides Membership, Participation, Payment Allocation, and Credit Ledger mechanics while preserving those canonical records.

## Mid-term credit policies

The selected Term's canonical Sessions are used to calculate the recommendation:

- **Remaining classes** (default): grants attendable Sessions that have not completed or elapsed.
- **Full term**: grants all attendable Sessions in the Term.
- **Custom**: grants the administrator-entered quantity.

Holiday and Cancelled Sessions are not attendable and are excluded from the calculation. The selected policy and calculated values are recalculated and retained in the admission result, Membership metadata, and audit metadata.

Payments remain independent from credits. A payment grants credits only when it is posted, and the grant is an append-only Credit Ledger entry linked to the Payment Allocation.

## Carry-forward

Credits remain on the Membership ledger after a Term ends. No balance is stored or reset. This makes unused credits available to a later Term without moving credits between Memberships.

Future organization/program configuration may add expiry, caps, approval, or same-program restrictions. Those policies must be implemented as configuration over the existing ledger rather than by adding a mutable balance or transferring ledger history.

## Integrity guarantee

The one-page UI submits `POST /api/admissions` with an `Idempotency-Key`. The server validates the canonical Program, Offering, Term, and Sessions, then commits Student, Membership, Participation, and optional posted Payment, Allocation, Ledger, Audit, and Outbox records in one transaction. Replaying the same key returns the original result without creating duplicates. A transaction-capable MongoDB deployment is required for this command.
