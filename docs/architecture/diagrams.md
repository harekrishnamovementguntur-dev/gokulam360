# Domain, ERD, and Module Diagrams

## Domain Model

```mermaid
flowchart TD
  O["Organization"] --> P["Program"]
  O --> CFG["Dedicated Configuration Modules"]
  P --> OF["Program Offering"]
  OF --> T["Term"]
  T --> S["Session"]
  ST["Student"] --> M["Membership"]
  P --> M
  M --> MTP["Membership Term Participation"]
  OF --> MTP
  T --> MTP
  MTP --> A["Attendance Record"]
  S --> A
  M --> CL["Credit Ledger Entry"]
  M --> PA["Payment Allocation"]
  PT["Payment Transaction"] --> PA
  M --> ACH["Achievement"]
  CI["Content Item"] --> CT["Content Target"]
  OF --> FC["Featured Content"]
  CI --> FC
  CFG --> DASH["Dashboard Configuration"]
```

## Entity Relationship Diagram

```mermaid
erDiagram
  ORGANIZATION ||--o{ PROGRAM : owns
  PROGRAM ||--o{ PROGRAM_OFFERING : delivered_as
  PROGRAM_OFFERING ||--o{ TERM : contains
  TERM ||--o{ SESSION : contains
  STUDENT ||--o{ MEMBERSHIP : holds
  PROGRAM ||--o{ MEMBERSHIP : connects
  MEMBERSHIP ||--o{ MEMBERSHIP_TERM_PARTICIPATION : participates
  PROGRAM_OFFERING ||--o{ MEMBERSHIP_TERM_PARTICIPATION : hosts
  TERM ||--o{ MEMBERSHIP_TERM_PARTICIPATION : scopes
  SESSION ||--o{ ATTENDANCE_RECORD : records
  MEMBERSHIP_TERM_PARTICIPATION ||--o{ ATTENDANCE_RECORD : receives
  MEMBERSHIP ||--o{ CREDIT_LEDGER_ENTRY : balances
  PAYMENT_TRANSACTION ||--o{ PAYMENT_ALLOCATION : allocates
  MEMBERSHIP ||--o{ PAYMENT_ALLOCATION : receives
  MEMBERSHIP ||--o{ ACHIEVEMENT : earns
  CONTENT_ITEM ||--o{ CONTENT_ASSET : has
  CONTENT_ITEM ||--o{ CONTENT_TARGET : targets
  PROGRAM_OFFERING ||--o{ FEATURED_CONTENT : selects
  CONTENT_ITEM ||--o{ FEATURED_CONTENT : features
```

## Module Dependency Diagram

```mermaid
flowchart LR
  Identity["Identity & Permissions"] --> Memberships
  Organizations["Organizations"] --> Config["Dedicated Configuration Modules"]
  Organizations --> Programs
  Config --> Programs["Programs & Offerings"]
  Programs --> Sessions["Terms & Sessions"]
  Programs --> Memberships["Memberships & Participation"]
  Memberships --> Attendance
  Sessions --> Attendance["Attendance"]
  Attendance --> Credits["Credit Ledger"]
  Payments["Payment Transactions"] --> Credits
  Credits --> Reporting["Reporting"]
  Content["Content Management"] --> ParentExperience["Parent Experience"]
  Config --> ParentExperience
  Memberships --> ParentExperience
  Achievements["Achievements & Certificates"] --> Reporting
  Audit["Audit & Outbox"] --> Notifications["Notifications & Integrations"]
  Reporting --> Dashboards["Dashboards"]
```
