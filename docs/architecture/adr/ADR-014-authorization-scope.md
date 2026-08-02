# ADR-014: Platform and Tenant Authorization Scopes

- **Status:** Accepted
- **Date:** 2026-08-01
- **Decision owners:** Gokulam360 architecture governance
- **Related:** Architecture Gita v1.0, Security and Reporting principles

## Problem

Gokulam360 is a multi-organization platform with a global Super Admin and organization-level users. Treating `organization_id` as universally required creates an incorrect model: the Super Admin is a platform actor and does not belong to an Organization.

At the same time, tenant-owned records must never be written without a clearly defined Organization scope.

The system therefore needs an explicit distinction between:

1. Platform-scoped operations.
2. Tenant-scoped operations.
3. A Super Admin performing a tenant-scoped operation for an explicitly selected Organization.

## Decision

### 1. Platform-scoped operations

Platform-scoped operations are global and do not require an Organization context on the authenticated actor.

Examples:

- Create an Organization.
- List Organizations.
- Assign an Organization Administrator during Organization creation.
- Manage platform-level organization lifecycle.

These operations must authorize the actor by role/capability and must not require or derive `organization_id` from the authenticated user.

### 2. Tenant-scoped operations

Tenant-scoped operations operate on data owned by one Organization.

For Organization Administrators, Teachers, and other tenant users:

- The Organization scope is derived from the authenticated context.
- A client-supplied `organization_id` cannot override the authenticated scope.
- Missing authenticated organization context is an authorization/identity error, not a reason to guess a tenant.

### 3. Super Admin performing a tenant-scoped operation

A Super Admin remains global and has no membership in an Organization.

When a Super Admin performs a tenant-scoped operation:

- The request must explicitly identify the target Organization.
- The target Organization is a selected resource scope, not the Super Admin's organization.
- The target must be validated before the domain command runs.
- The target Organization must be included in audit metadata and emitted domain-event metadata where applicable.
- The system must never infer the target from the first Organization, a default tenant, stale client state, or a null authenticated organization.

UI flows for Super Admins must provide an explicit Organization selector whenever the command requires tenant scope. APIs must make the distinction clear in their contract.

## Scope classification rule

Every new API and UI command must declare one of these classifications before implementation:

| Classification | Organization source | Example |
|---|---|---|
| Platform-scoped | None; global actor authorization | Create Organization |
| Tenant-scoped | Authenticated tenant context | Organization Admin creates a Membership |
| Super Admin tenant-scoped | Explicit validated target Organization | Super Admin creates a Membership for Organization A |

## Consequences

### Positive

- Preserves the correct global identity model for Super Admins.
- Prevents accidental tenant inference and cross-organization writes.
- Makes multi-organization UI behavior explicit.
- Improves auditability by recording the selected target Organization.
- Gives future PRs a clear authorization contract.

### Costs

- Super Admin tenant-scoped screens require an Organization selector.
- APIs must distinguish absent target scope from absent authenticated membership.
- Additional authorization tests are required for each new tenant-scoped command.

## Rejected alternatives

### Require every user to have an organization_id

Rejected because it incorrectly makes the Super Admin a tenant member and complicates platform-level organization creation.

### Infer the first or default Organization for Super Admin

Rejected because it is unsafe in a multi-organization system and can cause cross-tenant writes.

### Trust any client-supplied organization_id

Rejected because tenant users could attempt cross-organization access or mutation.

## Required test cases

Future domain PRs must cover:

- Super Admin can perform platform-scoped operations without `organization_id`.
- Super Admin tenant-scoped operations require an explicit target Organization.
- Invalid or nonexistent target Organizations are rejected.
- Tenant users cannot override their authenticated Organization.
- Audit and outbox metadata identify the target Organization for Super Admin tenant-scoped commands.
- Global operations do not accidentally invoke tenant-scope resolution.
