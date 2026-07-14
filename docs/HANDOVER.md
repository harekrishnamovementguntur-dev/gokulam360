# Gokulam360 — Project Handover Document

> **Version 1.0** · Last updated: June 2025
> **Audience**: Incoming engineering/product owners of the Gokulam360 platform.

---

## 1. Executive Summary

**Gokulam360** is a production-ready, multi-tenant SaaS platform for managing Sunday Schools, spiritual education programs, and educational institutions run by Hare Krishna / ISKCON organizations. It replaces the fragmented spreadsheets and messaging chains most Sunday Schools rely on today, with a modern, mobile-friendly web application.

### Value proposition

- **Multi-tenant**: hundreds of organizations, each fully isolated
- **Role-based**: Super Admin, Org Admin, Teacher, Parent
- **End-to-end**: Students, Teachers, Classes, Attendance, Fees, Events, Notifications, Reports, Backup
- **Zero-cost communication**: Free WhatsApp deep-links (no Twilio charges)
- **Public parent portal**: no-login access via QR code on ID card
- **Session-quota model**: aligned with real-world mid-term joiners paying full fees

### Deployment status

- **Live URL**: https://1551b1d6-33f9-4649-b590-bb6900d1b10c.preview.emergentagent.com
- **Runtime**: Next.js 15 App Router on Node.js 18+
- **Database**: MongoDB (single database, `gokulam360`)
- **Managed by**: Supervisor (`sudo supervisorctl restart nextjs`)

---

## 2. Feature Inventory (What's Done)

| Module | Status | Key Files |
|--------|--------|-----------|
| Authentication (JWT) | ✅ Complete | `/app/app/api/[[...path]]/route.js` (auth blocks) |
| Multi-tenant isolation | ✅ Complete | `orgScope()` helper in route.js |
| Super Admin — Organizations | ✅ Complete | 7-step onboarding wizard |
| Dashboard (KPIs, charts, heatmap, timeline) | ✅ Complete | `Dashboard` component in page.js |
| Students CRUD (grid view, photo upload) | ✅ Complete | `Students` component |
| Bulk Import (CSV / Excel) | ✅ Complete | `ImportStudents` component |
| Teachers CRUD | ✅ Complete | `Teachers` component |
| Classes / Batches with day-of-week schedule | ✅ Complete | `Classes` component |
| Multi-class enrollment (many-to-many) | ✅ Complete | `program_ids[]` on student |
| Enrollment history + Renewal | ✅ Complete | `EnrollmentHistoryDialog` |
| Session-quota & carry-over across terms | ✅ Complete | `sessions_credited/attended/remaining` |
| Session-level attendance | ✅ Complete | `Attendance` component |
| Session cancellation (holidays, teacher absence) | ✅ Complete | `POST /programs/:id/cancel-session` |
| Attendance validation (only class days allowed) | ✅ Complete | `isValidClassDay` guard |
| Fees with auto-generation on enrollment | ✅ Complete | `syncEnrollments()` helper |
| Notifications (Free WhatsApp via wa.me) | ✅ Complete | `Notifications` component |
| Low-quota reminder preset | ✅ Complete | `low_quota` target |
| Reports (Students / Attendance / Monthly Summary / Fees) | ✅ Complete | `Reports` + `AttendanceSummaryTable` |
| PDF / Excel / CSV export | ✅ Complete | `jspdf`, `xlsx` libs |
| Events | ✅ Complete | `Events` component |
| ID Card generation (with QR + parent link) | ✅ Complete | `printCard()` in Students |
| Public parent portal (no login) | ✅ Complete | `/app/app/p/[token]/page.js` |
| Parent Portal (login-based) | ✅ Complete | `ParentPortal` component |
| Data Backup / Restore (JSON) | ✅ Complete | `Backup` component |
| Dark / Light mode | ✅ Complete | HSL CSS variables |
| Command palette (⌘K) | ✅ Complete | cmdk-based |
| Confetti + animations | ✅ Complete | `canvas-confetti`, `framer-motion` |

### Explicitly out of scope (future work)

- Real SMS via Twilio/MSG91 (code stubs exist)
- Email digest to parents
- Row-level security in DB (currently enforced at API layer)
- Bulk term rollover (single-class renewal exists)
- Fee prorating for mid-term joiners (full fee charged, quota carries over instead)
- Enrollment history export
- Public organization directory
- Push notifications

---

## 3. Repository Layout

```
/app
├── app/
│   ├── api/[[...path]]/route.js   # Entire backend (single catch-all)
│   ├── p/[token]/page.js          # Public parent view (no auth)
│   ├── page.js                    # Entire SPA frontend
│   ├── layout.js                  # Root layout + fonts + toaster
│   └── globals.css                # Design tokens + utilities
├── components/ui/                 # shadcn/ui components (~40 files)
├── lib/utils.js                   # cn() helper
├── docs/
│   ├── HANDOVER.md                # This file
│   ├── USER_MANUAL.md             # End-user docs
│   ├── ARCHITECTURE.md            # Technical architecture
│   └── TECH_STACK.md              # Technology hierarchy
├── .env                           # MONGO_URL, JWT_SECRET, NEXT_PUBLIC_BASE_URL, TWILIO_*
├── package.json                   # Dependencies
├── tailwind.config.js             # Theme extension
└── README.md                      # Quick-start
```

---

## 4. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `MONGO_URL` | MongoDB connection URI | ✅ Yes |
| `DB_NAME` | Database name (default `gokulam360`) | Optional |
| `NEXT_PUBLIC_BASE_URL` | Public URL for QR/parent link generation | ✅ Yes |
| `JWT_SECRET` | Session token signing key | ✅ Yes |
| `CORS_ORIGINS` | Allowed origins (default `*`) | Optional |
| `TWILIO_ACCOUNT_SID` | If enabling paid SMS/WA later | Optional |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Optional |
| `TWILIO_SMS_FROM_NUMBER` | Twilio SMS-capable phone number | Optional |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender | Optional |

**Important**: Never commit `.env`. Never modify `NEXT_PUBLIC_BASE_URL` or `MONGO_URL` in code — always read from `process.env`.

---

## 5. Getting Started (New Developer)

### Prerequisites
- Node.js 18+, yarn, MongoDB 6+

### First-run
```bash
cd /app
yarn install            # (already done in this env)
sudo supervisorctl restart nextjs
curl -X POST http://localhost:3000/api/seed     # populate demo data
```

### Demo credentials (all password: `password123`)
- `super@gokulam360.com` — Super Admin (multi-org control)
- `admin@iskcongokulam.org` — Org Admin (full org access)
- `teacher@iskcongokulam.org` — Teacher (limited)
- `parent@iskcongokulam.org` — Parent (own child)

### Common commands
| Task | Command |
|------|---------|
| Restart backend/frontend | `sudo supervisorctl restart nextjs` |
| View backend logs | `tail -f /var/log/supervisor/nextjs.out.log` |
| Re-seed demo data | `curl -X POST /api/seed` |
| Install new dep | `yarn add <pkg>` (never `npm`) |

---

## 6. Data Model Overview

| Collection | Key fields |
|------------|------------|
| `organizations` | id, name, address, contact_email, contact_phone, currency, academic_year, is_deleted |
| `users` | id, email, password_hash, name, role, organization_id, student_id (parents only) |
| `students` | id, organization_id, student_id, first_name, last_name, dob, gender, mobile, program_id (legacy), program_ids[], status, photo_url, public_token, admission_date |
| `teachers` | id, organization_id, employee_id, name, mobile, email, qualification, skills |
| `programs` | id, organization_id, name, description, age_group, capacity, duration_months, start_date, end_date, days_of_week[], fee_amount, sessions[], cancelled_dates[] |
| `enrollments` | id, organization_id, student_id, program_id, enrolled_at, left_at, status, sessions_credited, renewed_from |
| `attendance` | id, organization_id, student_id, program_id, date, status, marked_by |
| `fees` | id, organization_id, student_id, program_id, fee_type, amount, paid_amount, status, due_date |
| `events` | id, organization_id, name, date, description |
| `notifications` | id, organization_id, channel, kind, message, recipients[], deliveries[], stats, sent_by |
| `activity` | id, organization_id, kind, title, actor, meta, created_at |

All documents use **UUID string primary keys** (never Mongo ObjectId) for JSON serializability. Every record includes `organization_id` for tenant isolation.

---

## 7. Security & Access Model

### Roles matrix

| Feature | Super Admin | Org Admin | Teacher | Parent |
|---------|:-----------:|:---------:|:-------:|:------:|
| Dashboard | ✅ (all orgs) | ✅ (own) | ✅ (own) | 🚫 (own child view) |
| Organizations | ✅ CRUD | 🚫 | 🚫 | 🚫 |
| Students | ✅ CRUD | ✅ CRUD | 👁 read | 👁 own child |
| Teachers | ✅ CRUD | ✅ CRUD | 🚫 | 🚫 |
| Classes | ✅ CRUD | ✅ CRUD | 👁 read | 🚫 |
| Attendance | ✅ CRUD | ✅ CRUD | ✅ CRUD | 👁 own child |
| Fees | ✅ CRUD | ✅ CRUD | 🚫 | 👁 own child |
| Notifications | ✅ | ✅ | 🚫 | 🚫 |
| Reports | ✅ | ✅ | 🚫 | 🚫 |
| Backup | ✅ | ✅ | 🚫 | 🚫 |

### Enforcement points
- **API-level**: `requireAuth(req, roles)` + `orgScope(user)` in `/app/app/api/[[...path]]/route.js`
- **UI-level**: `nav.filter(i => i.roles.includes(user.role))` in Shell component
- **Public API**: only `/api/public/student/:token` is unauthenticated; the token is a UUID with 122 bits of entropy

---

## 8. Handover Checklist

- [ ] Access to production `.env` (secrets in secure vault)
- [ ] MongoDB backup access + restore drill completed
- [ ] Domain / DNS ownership transferred
- [ ] Sentry / logging endpoint configured (currently stdout only)
- [ ] SSL certificate auto-renewal verified (managed by hosting)
- [ ] Emergent hosting account credentials shared
- [ ] Twilio credentials (if enabling real SMS later) shared
- [ ] Read `ARCHITECTURE.md` end-to-end
- [ ] Perform one full backup + restore cycle in staging
- [ ] Add a new organization via wizard end-to-end
- [ ] Bulk-import 10 students from Excel template
- [ ] Mark one attendance session and check quota decrement
- [ ] Send one WhatsApp reminder to a test number
- [ ] Scan an ID card QR from a phone → verify parent portal loads

---

## 9. Known Limitations & Trade-offs

1. **No RLS in MongoDB** — tenant isolation is enforced by `orgScope()` at API layer. Every new endpoint MUST include this filter. Add a code review checklist item.
2. **wa.me is manual-send** — user must click Send in WhatsApp. For fully automated bulk send, upgrade to Twilio or Meta WhatsApp Cloud API.
3. **Backup file is uncompressed JSON** — for large orgs (10k+ students), consider gzip compression.
4. **Photos stored as base64 in Mongo** — fine up to ~10k students, but for scale move to S3/Supabase Storage.
5. **Sessions array on program** — regenerated on every program update. For very long-running classes (>1 year), consider a separate `sessions` collection.
6. **Login has no rate limiting** — add Redis-backed rate limiter before public launch.
7. **No password reset flow** — Super Admin can manually update `users.password_hash` for now.

---

## 10. Support & Escalation

| Level | Contact |
|-------|---------|
| L1 tickets (org admins) | In-app WhatsApp: use notifications module |
| L2 (engineering) | Slack #gokulam360-dev (set up on handover) |
| L3 (data / infra) | DBA on-call rotation |
| Vendor: MongoDB | Atlas support portal |
| Vendor: Emergent hosting | https://app.emergent.sh |

---

Signed off by handover engineer · June 2025
