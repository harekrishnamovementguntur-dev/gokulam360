# Gokulam360 🙏

**A premium multi-tenant SaaS platform for Sunday Schools, spiritual education programs, and Hare Krishna organizations.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-green)](https://mongodb.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)](https://tailwindcss.com)

---

## What is Gokulam360?

A production-ready web application that manages every aspect of running a Sunday School — from student enrolment and attendance to fee collection and parent communication. Built with an **Apple-level attention to detail** and designed to feel like a **premium SaaS product**.

### Highlights

- 🎨 **Premium UI** — Glassmorphism, aurora backgrounds, animated counters, progress rings, command palette (⌘K)
- 🏢 **Multi-tenant** — Unlimited organizations, fully isolated
- 👥 **4 role types** — Super Admin, Org Admin, Teacher, Parent
- 📅 **Session-based attendance** — Auto-generated from class schedule (days of week)
- 🎯 **Session-quota model** — Mid-term joiners get full 16 sessions, quota carries across terms
- 💰 **Auto-generated fees** — Per enrollment, per renewal
- 💚 **Free WhatsApp notifications** — Uses wa.me deep-links (₹0 forever)
- 📱 **Public parent portal** — Scan QR on ID card → instant view (no login)
- 💾 **One-click backup / restore** — JSON export of entire org data
- 📊 **Rich reports** — PDF, Excel, CSV export

---

## Documentation

| Document | Purpose |
|----------|---------|
| [**docs/HANDOVER.md**](docs/HANDOVER.md) | Project overview, feature inventory, handover checklist |
| [**docs/USER_MANUAL.md**](docs/USER_MANUAL.md) | Step-by-step guide for org admins, teachers, parents |
| [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Technical architecture, data model, security, scaling |
| [**docs/TECH_STACK.md**](docs/TECH_STACK.md) | Complete technology inventory & trade-offs |

---

## Quick Start (Local)

```bash
# 1. Install deps
cd /app && yarn install

# 2. Ensure /app/.env has:
#    MONGO_URL=mongodb://localhost:27017
#    DB_NAME=gokulam360
#    JWT_SECRET=your-secret
#    NEXT_PUBLIC_BASE_URL=<public url>

# 3. Start
sudo supervisorctl restart nextjs

# 4. Seed demo data
curl -X POST http://localhost:3000/api/seed
```

### Demo credentials (all password: `password123`)

- `super@gokulam360.com` — Super Admin
- `admin@iskcongokulam.org` — Org Admin
- `teacher@iskcongokulam.org` — Teacher
- `parent@iskcongokulam.org` — Parent

---

## Project Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js   # Entire backend
│   ├── p/[token]/page.js          # Public parent view
│   ├── page.js                    # Entire SPA frontend
│   ├── layout.js
│   └── globals.css
├── components/ui/                 # shadcn/ui components
├── docs/                          # All documentation
├── .env                           # Environment variables
└── package.json
```

---

## Feature Modules

1. **Authentication** — JWT, 4 roles, secure bcrypt hashing
2. **Organizations** — 7-step onboarding wizard for Super Admin
3. **Dashboard** — KPI cards, area charts, progress rings, attendance heatmap, activity timeline
4. **Students** — CRUD grid, photo upload, multi-class enrollment, enrollment history drawer
5. **Bulk Import** — CSV/Excel upload with column mapping preview
6. **Teachers** — CRUD with employee IDs, skills, qualifications
7. **Classes & Batches** — 7-day scheduler, capacity, fees, auto-generated sessions
8. **Attendance** — Session strip picker, day validation, session cancellation, quota badges
9. **Enrollments** — History with session credits, carry-over across terms, one-click renewal
10. **Fees** — Auto-generated per enrollment, one-click mark paid
11. **WhatsApp Notifications** — Free wa.me deep-links, low-quota target, live phone preview
12. **Reports** — Students / Attendance / Monthly Summary / Fees — PDF/Excel/CSV export
13. **Events** — Cultural celebrations with gradient banners
14. **ID Cards** — Print-ready PDF with QR to parent portal
15. **Data Backup** — Full org JSON export + restore
16. **Public Parent Portal** — No-login view via QR scan
17. **Command Palette (⌘K)** — Jump to anything
18. **Dark / Light mode** — HSL-based, animation-preserving toggle

---

## Technology Stack

**Frontend**: Next.js 15 · React 19 · Tailwind 4 · shadcn/ui · framer-motion · recharts · lucide-react
**Backend**: Next.js API routes · MongoDB · JWT · bcryptjs
**Exports**: jsPDF · xlsx (SheetJS) · qrcode
**Optional integrations**: Twilio (SMS/WhatsApp, off by default)

Full details in [TECH_STACK.md](docs/TECH_STACK.md).

---

## Contributing / Extending

See [ARCHITECTURE.md § 8](docs/ARCHITECTURE.md#8-extension-points) for common extension points. Key rules:

1. **Never bypass `orgScope()`** — tenant isolation is enforced at every query.
2. **Use UUIDs, not ObjectIds** — JSON serialization + public tokens.
3. **Soft delete only** — never `deleteOne`; set `is_deleted: true`.
4. **New APIs**: prefix all with `/api`.
5. **New env vars**: never hardcode URLs or ports — always `process.env.*`.
6. **New shadcn components**: import from `@/components/ui/*`, don't rewrite them.

---

## License & Attribution

Built with devotion for Hare Krishna organizations 🙏

---

**Hare Krishna · Serve with devotion**
