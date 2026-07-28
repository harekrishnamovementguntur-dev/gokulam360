# Ubiquitous Language Glossary

These are the canonical terms for Gokulam360. Use them consistently in database names, API contracts, documentation, and UI. A local UI label may be friendlier, but it must map to the same domain term.

| Term | Definition |
|---|---|
| **Organization** | A tenant that owns people, policies, academic operations, content, and data. |
| **Student** | An organization-scoped person who may hold one or more Memberships. |
| **Program** | The reusable academic definition: curriculum, objectives, academic rules, and certificate criteria. It has no pricing. |
| **Program Offering** | A concrete delivery of a Program for a cohort, batch, location, or period. “Batch” is a presentation label for an Offering where appropriate. |
| **Term** | A bounded academic period within one Program Offering. |
| **Session** | A scheduled class or meeting within a Term. It owns schedule, teacher, topic, location, status, and Attendance. |
| **Membership** | The durable Student-to-Program relationship. It is the central business entity and survives operational changes. |
| **Membership Term Participation** | The time-bound participation of a Membership in a particular Program Offering and Term. |
| **Attendance Record** | A record of a Participation’s attendance for one Session. |
| **Credit** | An operational unit consumed according to Credit Policy; it is not money. |
| **Credit Ledger** | The append-only record of all credit increases and decreases for a Membership. Its sum is the credit balance. |
| **Payment Transaction** | An immutable record of money received, settled, refunded, voided, or reversed. |
| **Payment Allocation** | The link that allocates a Payment Transaction to one or more Memberships and may grant credits. |
| **Credit Policy** | An organization configuration module that governs credit consumption, expiry, transfer, and related controls. It is not a price list or Billing Policy. |
| **Content Item** | A generic managed item such as an Event, verse, quote, Festival, News item, Announcement, Story, Video, Audio, Gallery, PDF, or Custom Content. |
| **Content Type** | A configurable classification with validation and presentation metadata for a Content Item. |
| **Content Target** | A rule that limits Content Item visibility to a relevant audience such as Program, Offering, academic year, membership status, or age group. |
| **Featured Content** | An explicit selection of a Content Item for a Program Offering dashboard; no more than three active selections are permitted. |
| **Dashboard Configuration** | The organization configuration module that determines dashboard layout and which Featured Content surfaces are displayed. |
| **Achievement** | A Membership-owned recognition, milestone, award, result, or service record. |
| **Audit Log** | An immutable record of who performed an important action, on which entity, when, and with what correlation context. |
| **Domain Event** | A statement that a business fact occurred, for example Attendance Recorded. |
| **Transactional Outbox** | Persisted events written atomically with the command that caused them, then delivered asynchronously. |
| **Lifecycle** | The allowed state transitions and historical state changes of an entity. |
| **Archived** | Retained for history and normally unavailable for new operations; it is not deletion. |

## Terms to avoid as domain names

- **Fee Management** — legacy wording. Use **Payment Transactions** and **Credit Ledger**.
- **Billing Policy** — explicitly out of scope for Version 1.
- **Student joins a Term** — use **Membership Term Participation**.
- **Featured Event** — use **Featured Content**; Event is only one Content Type.
- **Deleted Membership** — not permitted. Use the appropriate supported Membership lifecycle state.
