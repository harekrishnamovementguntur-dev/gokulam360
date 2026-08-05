# ADR-004: Use a Transactional Outbox for Domain Events

**Status:** Accepted

## Problem

Directly sending notifications or updating projections from request handlers creates lost-event and partial-failure risks. Microservices now would create operational overhead.

## Alternatives

1. Synchronous direct module calls.
2. Immediate microservices and message broker.
3. Modular monolith with transactional outbox.

## Decision

Each command writes its aggregate change, audit record, and outbox event atomically. Workers dispatch events asynchronously.

## Consequences

The platform gains reliable event-driven integration without distributed transactions. Modules remain deployable together until scale justifies extraction.
