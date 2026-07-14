# Gokulam360 — Architecture Document

> **Version 1.0** · Technical deep-dive for engineers

---

## 1. System Overview

Gokulam360 is a **single-container full-stack SaaS application** with a **single monolithic backend route** and a **single SPA frontend page**, all running inside Next.js 15's App Router. This intentional simplicity keeps the codebase auditable, low-latency, and easy to onboard.

### High-level topology

```
┌───────────────────────────────────────────────────────────────┐
│                     Kubernetes Ingress                        │
│   (routes all traffic to service:3000)                        │
└───────────────┬───────────────────────────────────────────────┘
                │
     ┌──────────▼───────────┐
     │  Next.js 15 (App)    │   Port 3000  ── supervisorctl
     │  ├─ SPA at  /        │              (hot-reload dev)
     │  ├─ Public at /p/*   │
     │  └─ API   at /api/*  │
     └──────────┬───────────┘
                │ (mongodb://)
     ┌──────────▼───────────┐
     │  MongoDB (local)     │   Persistent volume
     │  Database: gokulam360│
     └──────────────────────┘

     External integrations (client-side):
     ├─ wa.me deep-links     (free WhatsApp)
     ├─ Twilio SDK           (optional, backend)
     ├─ jsPDF + qrcode       (PDF + QR generation)
     └─ xlsx                 (Excel export)
```

---

## 2. Frontend Architecture

### 2.1 SPA-in-a-page pattern

All authenticated pages live inside a **single component tree** under `/app/app/page.js`:

- `App` — root, handles auth state + URL detection
- ├─ `Login` — unauthenticated landing
- ├─ `Shell` — authenticated layout (sidebar + header + main)
- │   └─ **View components** (rendered via `view` state):
- │       ├─ `Dashboard` · `Organizations` · `Students`
- │       ├─ `Teachers` · `Classes` · `Attendance`
- │       ├─ `Fees` · `Notifications` · `Reports`
- │       ├─ `Events` · `Backup`
- ├─ `ParentPortal` — role: parent
- └─ `PublicParentView` — used in a **separate** file `/app/app/p/[token]/page.js`

### 2.2 State management

- **Local React state** for UI (no Redux/Zustand needed at this scale)
- **localStorage** for JWT persistence (`store.token`)
- **Fetch API** for network — thin wrapper `api(path, opts)` adds auth header + parses errors
- **`useMemo`** for derived data (filters, counts)

### 2.3 Styling & design system

- **Tailwind CSS 4** with HSL-based custom properties for theming
- **shadcn/ui** components (button, dialog, card, tabs, table, select, avatar, progress, skeleton, command)
- **CSS variables** in `/app/app/globals.css` define primary=`262 83% 58%` (violet)
- **Custom utilities**: `.glass`, `.bg-aurora`, `.bg-mesh-warm`, `.card-lift`, `.text-gradient`, `.aurora-border`, `.ring-glow`
- **Framer Motion** for page transitions, staggered card entry, spring counters, hero animations
- **canvas-confetti** for celebratory feedback on create/save actions

### 2.4 Client-side routing

App uses **path-based detection**, not React Router:

- `/` — main SPA (auth-gated)
- `/p/:token` — public parent view (own Next.js page file)

Inside the SPA, navigation is handled via a `view` state variable in the `Shell` component. Framer Motion `AnimatePresence` fades between views.

### 2.5 Key libraries loaded on-demand (dynamic import)

- `jspdf` — for ID card + report PDFs
- `qrcode` — for QR code data URLs
- `xlsx` — for Excel import/export

These are `await import(...)` lazy-loaded to keep initial bundle small.

---

## 3. Backend Architecture

### 3.1 The single-route pattern

Every API call hits `/app/app/api/[[...path]]/route.js`. Next.js's catch-all route captures every path under `/api/*`. Inside, a `router()` function dispatches by parsing:

```js
const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
const [resource, id, sub] = parts;
```

So `/api/programs/abc-123/sessions` → `resource='programs', id='abc-123', sub='sessions'`.

### 3.2 Handler structure

```js
router(req, method):
  ├─ Health / Config / Public routes (no auth)
  ├─ /auth/login (issues JWT)
  ├─ /auth/me    (verifies JWT)
  ├─── require auth ─────
  ├─ Organizations (super_admin only)
  ├─ Generic collection handler:
  │    ├─ students, teachers, programs, fees, events, attendance
  │    └─ GET / POST / PUT / DELETE
  ├─ Special endpoints:
  │    ├─ /attendance-bulk
  │    ├─ /enrollments (+ /renew)
  │    ├─ /programs/:id/sessions
  │    ├─ /programs/:id/cancel-session
  │    ├─ /students-import
  │    ├─ /notifications (fan-out to Twilio or mock)
  │    ├─ /activity
  │    ├─ /parent/me
  │    ├─ /reports/:type
  │    ├─ /dashboard
  │    ├─ /backup/export
  │    └─ /backup/restore
  └─ Fallback 404
```

### 3.3 Auth

- **JWT (HS256)** signed with `JWT_SECRET`, expires in 7 days
- Password hash with **bcryptjs** (10 rounds)
- `Authorization: Bearer <token>` header on every protected request
- `verifyToken()` returns payload or `null`
- `requireAuth(req, roles)` short-circuits with 401/403 if invalid

### 3.4 Tenant isolation

**Critical invariant**: every query on a tenant-scoped collection uses `orgScope(user, extras)`:

```js
function orgScope(user, extra = {}) {
  if (user.role === 'super_admin') return { ...extra };
  return { organization_id: user.organization_id, ...extra };
}
```

Super Admin sees across all orgs; everyone else is filtered by `organization_id`.

### 3.5 Session generation logic

```js
function generateSessions(program) {
  // Iterate every day from start_date to end_date
  // Include if day_of_week matches program.days_of_week[]
  // Exclude if date is in program.cancelled_dates[]
  return sortedDates;
}
```

Sessions are **materialized** into `program.sessions` on program create/update. This makes attendance queries O(1) lookups instead of O(n) day-of-week filters.

### 3.6 Enrollment lifecycle

```
┌─────────────────┐
│ Student created │
│ w/ program_ids  │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ syncEnrollments()        │
│ ├─ For each added pid:   │
│ │   ├─ Insert enrollment │
│ │   │  { sessions_credited: remaining_sessions_from_today }
│ │   └─ Insert fee record │
│ │      { amount: program.fee_amount, status: pending }
│ └─ For each removed pid: │
│     └─ Set left_at=now, status='left'
└──────────────────────────┘
```

**Renew flow**: mark old as `completed`, insert fresh enrollment + new fee row with `renewed_from: oldId`.

### 3.7 Public parent endpoint (no auth)

`GET /api/public/student/:token` matches on `students.public_token`. Returns curated fields only (no phone, no internal IDs). Token is `uuidv4()` — 122 bits of entropy.

---

## 4. Data Model

### 4.1 Entity-Relationship

```
[organizations] 1 ──── * [users]
       1 ──── * [students] * ──── * [programs]
              1 ──── *              (via program_ids array + enrollments)
              │
              1 ──── * [enrollments] * ──── 1 [programs]
              │                              │
              │                              1
              │                              │
              │                              1 ── * [attendance]
              │                                    (via program_id, date)
              │
              1 ──── * [fees]

[organizations] 1 ──── * [events]
[organizations] 1 ──── * [notifications]
[organizations] 1 ──── * [activity]
```

### 4.2 Key indexes (recommended for production)

```js
db.students.createIndex({ organization_id: 1, status: 1 });
db.students.createIndex({ public_token: 1 }, { unique: true, sparse: true });
db.enrollments.createIndex({ student_id: 1, program_id: 1 });
db.enrollments.createIndex({ organization_id: 1, program_id: 1, left_at: 1 });
db.attendance.createIndex({ organization_id: 1, program_id: 1, date: 1 });
db.attendance.createIndex({ organization_id: 1, student_id: 1 });
db.fees.createIndex({ organization_id: 1, status: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

### 4.3 Soft delete pattern

All destructive operations set `is_deleted: true` instead of `deleteOne`. Every read query filters with `is_deleted: { $ne: true }`. This preserves history and enables trivial restore.

### 4.4 Sessions_credited semantics

- Calculated **once** at enrollment time = number of `program.sessions` where `date >= enrollment.enrolled_at`
- **Never** recomputed on program changes (would break history)
- `sessions_attended` is **computed on read** from `attendance` records (source of truth)
- `sessions_remaining = credited - attended`, clamped ≥0

---

## 5. Deployment & Ops

### 5.1 Runtime

- **Process manager**: `supervisor` runs `next dev` on 0.0.0.0:3000 with `--max-old-space-size=2048`
- **Hot reload**: enabled — file saves trigger recompile
- **Restart**: `sudo supervisorctl restart nextjs`
- **Logs**: `/var/log/supervisor/nextjs.out.log`

### 5.2 Environment variables

Loaded from `/app/.env` by Next.js. **Never commit** this file. See `HANDOVER.md` §4.

### 5.3 Scaling considerations

| Load | Approach |
|------|----------|
| Up to ~500 orgs, 50k students | Current single-container is fine |
| 500–5000 orgs | Move to `next start` (built), horizontal scale behind LB, MongoDB replica set |
| 5000+ orgs | Migrate photos to object storage (S3/Supabase), shard by org_id, dedicated read replicas |

### 5.4 Observability

Current: stdout via supervisor. **Recommended additions**:

- Sentry for error tracking
- Pino/Winston structured logs → Loki/Elastic
- Prometheus metrics at `/api/metrics`
- Uptime monitoring (UptimeRobot, Pingdom)

### 5.5 Backup strategy

- **User-driven**: Backup page in-app (JSON per org)
- **DB-level**: `mongodump` cron job to S3, retention 30d
- **Application-level**: nightly export of every org's JSON to persistent storage

---

## 6. Integration Points

### 6.1 WhatsApp (free, current)

- Uses `https://wa.me/{phone}?text={url_encoded_message}` deep-links
- Opens in a new browser tab (or WhatsApp app if installed)
- User must **manually confirm send** in WhatsApp — provides audit-friendly workflow
- No API keys, no costs, no rate limits

### 6.2 Twilio (optional, coded but not enabled)

- SDK in `route.js` handles SMS + WhatsApp
- Auto-activates if `TWILIO_ACCOUNT_SID` starts with `AC`
- Falls back to "mock" mode if not configured
- E.164 normalizer converts Indian 10-digit numbers → `+91XXXXXXXXXX`

### 6.3 PDF generation

- Client-side `jspdf` (no server round-trip)
- ID cards: 54×86mm, portrait
- Reports: A4 landscape
- QR codes via `qrcode` lib → data URL → embedded via `doc.addImage()`

### 6.4 Excel import/export

- `xlsx` (SheetJS) — pure client-side
- Supports .csv, .xlsx, .xls
- Column mapping is name-based (case-tolerant fallbacks)

---

## 7. Security Model

### 7.1 Attack surface

| Vector | Mitigation |
|--------|------------|
| SQL injection | N/A (MongoDB with parameterized queries via driver) |
| NoSQL injection | Input validation, no user-controlled queries |
| XSS | React auto-escapes; `dangerouslySetInnerHTML` never used |
| CSRF | JWT in `Authorization` header (not cookies) |
| Token theft | localStorage — same-origin only |
| Public parent link brute-force | UUID = 122 bits entropy → 2^122 space |
| Cross-tenant data access | Enforced by `orgScope()` on every query |
| Password stuffing | ⚠️ No rate limiting yet — **add before public launch** |
| Data breach | Passwords bcrypted; encryption at rest via disk/DB config |

### 7.2 Compliance-ready design

- **Data portability**: JSON export in-app
- **Right to erasure**: Soft delete + manual purge script
- **Audit trail**: `activity` collection logs sensitive actions
- **Access control**: 4-tier RBAC, org-scoped by default

---

## 8. Extension Points

Common future work and where to hook it:

| Feature | Where to add |
|---------|--------------|
| Real SMS provider | `sendTwilioMessage()` in `route.js` |
| Email notifications | Add SendGrid client next to Twilio |
| Push notifications | Web Push API — add SW at `/app/app/sw.js` |
| Bulk term rollover | New endpoint `POST /enrollments/bulk-renew` |
| Fee prorating | Modify `syncEnrollments()` to calc partial fee |
| Multi-org for one user | Change `users.organization_id` → `organization_ids[]` |
| Row-level security | Move to Supabase or MongoDB with client-side realm |
| Real-time updates | Add socket.io or Pusher — event on activity insert |
| Reports scheduler | Cron worker calls `/api/reports/*` → email |

---

**End of Architecture Document**
