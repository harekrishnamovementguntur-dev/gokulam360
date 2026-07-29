# Gokulam360 Implementation Roadmap

This roadmap governs implementation after Architecture Gita v1.0. The current application is a development shell with sample data only. Canonical domains are built first; a coordinated cutover occurs after the core architecture is complete.

## Status

| Phase | Scope | Status |
|---|---|---|
| PR #13 | Membership foundation and UI | Completed / merged |
| PR #14 | Program and Program Offering | In review |
| PR #15 | Terms and Sessions | Planned |
| PR #16 | Membership Term Participation | Planned |
| PR #17 | Credit Ledger and Payments | Planned |
| PR #18 | Attendance Integration | Planned |
| PR #19 | Coordinated Application Cutover | Planned |
| PR #20 | Legacy Removal and Cleanup | Planned |

## Governance

- Canonical domains are implemented with explicit contracts and tests.
- The development shell is temporary and must not receive new business capabilities.
- No migration framework, synchronization, or dual writes are introduced.
- Demo data is regenerated using the canonical model during the coordinated cutover.
- Each completed PR updates this document with delivered capabilities, remaining risks, and the next dependency.

## Cutover sequence

PR #19 will move Students, enrollment, Fees, Attendance, Reports, imports, backups, Parent Portal, and dashboard consumers to canonical relationships. PR #20 will remove obsolete legacy routes, fields, seed logic, and collections after the cutover is verified.

## Current remaining work

Terms, Sessions, Membership Term Participation, Credit Ledger, Payments, Attendance integration, coordinated consumer cutover, and legacy cleanup remain outstanding.
