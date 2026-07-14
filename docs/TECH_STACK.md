# Gokulam360 — Technology Stack Hierarchy

> **Version 1.0** — Complete inventory of every technology used, why, and where.

---

## Legend

- 🟢 **Primary** — Core, non-negotiable
- 🟡 **Supporting** — Chosen deliberately for a specific job
- 🔵 **Utility** — Small helpers
- ⚪ **Dev-only** — Not shipped to production

---

## 1. Runtime & Language

| Layer | Technology | Version | Why |
|-------|------------|---------|-----|
| 🟢 Runtime | **Node.js** | 18+ | Latest LTS, native fetch, ES modules |
| 🟢 Language | **JavaScript (ES2023)** | — | No TypeScript by design — velocity for MVP; migration path documented |
| 🟢 Package manager | **yarn** | 1.22+ | Consistent with hosting; deterministic installs |

---

## 2. Application Framework

| Layer | Technology | Version | Why |
|-------|------------|---------|-----|
| 🟢 Meta-framework | **Next.js** | 15.5 | App Router, catch-all API routes, hot reload, single-container deploy |
| 🟢 UI library | **React** | 19 | Concurrent rendering, transitions, use hook |
| 🟢 Rendering | **Server + Client Components** | — | `'use client'` only where needed (state, effects) |

---

## 3. Data Layer

| Layer | Technology | Version | Why |
|-------|------------|---------|-----|
| 🟢 Database | **MongoDB** | 6+ | Schemaless flexibility fits evolving MVP; native JSON |
| 🟢 Driver | **mongodb** (official) | 6.x | Native async, connection pooling |
| 🔵 Primary keys | **uuid** (v4) | 11.x | JSON-serializable, never Mongo ObjectId |

---

## 4. Authentication & Security

| Layer | Technology | Version | Why |
|-------|------------|---------|-----|
| 🟢 Session | **jsonwebtoken (JWT)** | 9.x | Stateless, header-based (no CSRF via cookies) |
| 🟢 Password hash | **bcryptjs** | 3.x | Pure JS, no native compile |
| 🟡 Public token | **uuid v4** | — | For QR parent links (122-bit entropy) |

---

## 5. Styling System

| Layer | Technology | Version | Why |
|-------|------------|---------|-----|
| 🟢 CSS framework | **Tailwind CSS** | 4.x | Utility-first, dark-mode via HSL vars |
| 🟢 Component library | **shadcn/ui** | latest | Un-opinionated, copy-paste, Radix underneath |
| 🟢 Primitives | **Radix UI** | latest | Accessible headless components |
| 🟡 Icons | **lucide-react** | latest | Tree-shakable, consistent 24px grid |
| 🟡 Animations | **framer-motion** | 12.x | Springs, layout animations, AnimatePresence |
| 🔵 Confetti | **canvas-confetti** | 1.x | Delight on create/save |
| 🔵 Utility | **class-variance-authority + tailwind-merge + clsx** | — | shadcn variant composition |
| 🔵 Toasts | **sonner** | latest | Beautiful, low-config |

### Design tokens (HSL-based)

```
primary:   262 83% 58%   (violet)
accent:    224 76% 58%   (indigo)
emerald / rose / amber / teal for status
```

---

## 6. Frontend Feature Libraries

| Purpose | Library | Version |
|---------|---------|---------|
| Charts | **recharts** | 3.x |
| Command palette | **cmdk** | 1.x |
| Date picker | **react-day-picker** | 9.x |
| Forms | **react-hook-form** | 7.x |
| Schema validation | **zod** (available, minimally used in MVP) | 4.x |
| Number counters | **framer-motion** (`useSpring`) | 12.x |
| Progress rings | Native SVG + framer-motion | — |
| Command K shortcut | Native `keydown` listener | — |

---

## 7. Documents & Exports

| Purpose | Library | Version |
|---------|---------|---------|
| PDF generation (ID cards, reports) | **jspdf** | 3.x |
| QR codes (on ID cards) | **qrcode** | 1.x |
| Excel + CSV | **xlsx (SheetJS)** | 0.18.x |

---

## 8. Communication

| Channel | Technology | Notes |
|---------|------------|-------|
| 🟢 WhatsApp (production) | **wa.me deep-links** | Free forever, no API |
| 🟡 SMS / WhatsApp (optional) | **twilio SDK** | 5.x — coded but off by default |
| ⚪ Email | *not yet integrated* | Placeholder pattern in notifications module |

---

## 9. Development Ecosystem

| Purpose | Tool |
|---------|------|
| Process manager | supervisord |
| Hot reload | Next.js built-in |
| Linter | (recommended) ESLint — not enforced in MVP |
| Prettier | Recommended for handover team |
| Env loading | Next.js native (`.env`) |

---

## 10. Infrastructure & Hosting

| Layer | Technology |
|-------|------------|
| Container | Docker (managed by hosting) |
| Orchestration | Kubernetes (Emergent preview environment) |
| Ingress | Kubernetes Ingress — routes `*` to service:3000 |
| Process supervisor | supervisord |
| Persistent storage | Container-mounted volume for MongoDB |
| TLS | Managed by hosting proxy |

---

## 11. External Services (Current)

| Service | Purpose | Cost |
|---------|---------|------|
| MongoDB (local instance) | Data persistence | $0 |
| wa.me | Free WhatsApp messaging | $0 |
| Emergent hosting | Container hosting | Per-plan |

---

## 12. Optional / Ready-to-plug

Coded but currently inactive. Just add env vars to enable:

| Service | Env vars | Cost |
|---------|----------|------|
| Twilio SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM_NUMBER` | ~$0.0075 per SMS |
| Twilio WhatsApp | + `TWILIO_WHATSAPP_FROM` | ~$0.005 per message |

---

## 13. Dependency Tree (top-level from package.json)

```
gokulam360@
├── next@15
├── react@19 · react-dom@19
├── mongodb@6
├── jsonwebtoken@9
├── bcryptjs@3
├── uuid@11
├── jspdf@3
├── qrcode@1
├── xlsx@0.18
├── canvas-confetti@1
├── twilio@5                (optional)
├── framer-motion@12
├── recharts@3
├── lucide-react@latest
├── @radix-ui/react-*      (shadcn primitives)
├── tailwindcss@4 · postcss · autoprefixer
├── sonner@latest
├── cmdk@latest
├── react-hook-form@7
├── zod@4
├── react-day-picker@9
├── class-variance-authority@0.7 · clsx@2 · tailwind-merge@3
```

See `/app/package.json` for exact pinned versions.

---

## 14. Why These Choices — Trade-offs Documented

### JavaScript over TypeScript

- ⚡ Faster MVP iteration
- 📉 Fewer files, no build config for types
- ➕ Handover team can gradually add JSDoc / migrate to TS incrementally

### MongoDB over PostgreSQL

- 🟢 The pre-configured environment provides MongoDB
- 🟢 Schemaless suits evolving multi-tenant MVP
- 🟡 Trade-off: no Row Level Security — enforced at API layer via `orgScope()`

### Single-file API over route-per-endpoint

- ⚡ Everything visible in one file — low cognitive load
- 🔍 One place for auth, tenant filter, error handling
- ⚠️ Trade-off: file grows large (~900 lines). Refactor into modules if it exceeds 2000 lines.

### Single-file frontend over per-route pages

- ⚡ Zero navigation lag between modules (client-side state switch)
- ⚡ Shared state (org info, user) trivially accessible
- ⚠️ Trade-off: bundle size — mitigated by dynamic imports for heavy libs (jspdf, xlsx, qrcode)

### wa.me over Twilio for MVP

- 💰 Free vs ~₹80/month subscription
- 🚀 Works from day 1 — no vendor verification, no DLT registration in India
- 👤 Feels human — messages come from admin's own WhatsApp
- ⚠️ Trade-off: user must confirm each send. For bulk automated flows, add Twilio (SDK already integrated).

---

## 15. Upgrade Path

| Milestone | What to add |
|-----------|-------------|
| **500 students / org** | MongoDB indexes (see ARCHITECTURE.md §4.2), photo storage → S3 |
| **10 orgs** | Sentry + structured logging |
| **50 orgs** | Rate limiting (Redis), password reset flow, email verification |
| **100 orgs** | TypeScript migration, split monolithic route.js, unit tests (Jest) |
| **500 orgs** | Horizontal scale, MongoDB replica set, background job queue (BullMQ) |
| **1000+ orgs** | Kubernetes multi-pod, dedicated Redis, sharding by org_id, CDN for public parent portal |

---

**End of Tech Stack Document · Hare Krishna 🙏**
