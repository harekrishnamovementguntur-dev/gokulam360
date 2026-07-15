# Gokulam360 ðŸ™

**A premium multi-tenant SaaS platform for Sunday Schools, spiritual education programs, and Hare Krishna organizations.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-green)](https://mongodb.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)](https://tailwindcss.com)

---

## What is Gokulam360?

A production-ready web application that manages every aspect of running a Sunday School â€” from student enrolment and attendance to fee collection and parent communication. Built with an **Apple-level attention to detail** and designed to feel like a **premium SaaS product**.

### Highlights

- ðŸŽ¨ **Premium UI** â€” Glassmorphism, aurora backgrounds, animated counters, progress rings, command palette (âŒ˜K)
- ðŸ¢ **Multi-tenant** â€” Unlimited organizations, fully isolated
- ðŸ‘¥ **4 role types** â€” Super Admin, Org Admin, Teacher, Parent
- ðŸ“… **Session-based attendance** â€” Auto-generated from class schedule (days of week)
- ðŸŽ¯ **Session-quota model** â€” Mid-term joiners get full 16 sessions, quota carries across terms
- ðŸ’° **Auto-generated fees** â€” Per enrollment, per renewal
- ðŸ’š **Free WhatsApp notifications** â€” Uses wa.me deep-links (â‚¹0 forever)
- ðŸ“± **Public parent portal** â€” Scan QR on ID card â†’ instant view (no login)
- ðŸ’¾ **One-click backup / restore** â€” JSON export of entire org data
- ðŸ“Š **Rich reports** â€” PDF, Excel, CSV export

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
#    # Never enable this in production; permits demo-database reset locally.
#    ALLOW_DEMO_SEED=true
#    NEXT_PUBLIC_BASE_URL=<public url>

# 3. Start
sudo supervisorctl restart nextjs

# 4. Seed demo data
curl -X POST http://localhost:3000/api/seed
```

### Demo credentials (all password: `password123`)

- `super@gokulam360.com` â€” Super Admin
- `admin@iskcongokulam.org` â€” Org Admin
- `teacher@iskcongokulam.org` â€” Teacher
- `parent@iskcongokulam.org` â€” Parent

---

## Project Structure

```
/app
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ api/[[...path]]/route.js   # Entire backend
â”‚   â”œâ”€â”€ p/[token]/page.js          # Public parent view
â”‚   â”œâ”€â”€ page.js                    # Entire SPA frontend
â”‚   â”œâ”€â”€ layout.js
â”‚   â””â”€â”€ globals.css
â”œâ”€â”€ components/ui/                 # shadcn/ui components
â”œâ”€â”€ docs/                          # All documentation
â”œâ”€â”€ .env                           # Environment variables
â””â”€â”€ package.json
```

---

## Feature Modules

1. **Authentication** â€” JWT, 4 roles, secure bcrypt hashing
2. **Organizations** â€” 7-step onboarding wizard for Super Admin
3. **Dashboard** â€” KPI cards, area charts, progress rings, attendance heatmap, activity timeline
4. **Students** â€” CRUD grid, photo upload, multi-class enrollment, enrollment history drawer
5. **Bulk Import** â€” CSV/Excel upload with column mapping preview
6. **Teachers** â€” CRUD with employee IDs, skills, qualifications
7. **Classes & Batches** â€” 7-day scheduler, capacity, fees, auto-generated sessions
8. **Attendance** â€” Session strip picker, day validation, session cancellation, quota badges
9. **Enrollments** â€” History with session credits, carry-over across terms, one-click renewal
10. **Fees** â€” Auto-generated per enrollment, one-click mark paid
11. **WhatsApp Notifications** â€” Free wa.me deep-links, low-quota target, live phone preview
12. **Reports** â€” Students / Attendance / Monthly Summary / Fees â€” PDF/Excel/CSV export
13. **Events** â€” Cultural celebrations with gradient banners
14. **ID Cards** â€” Print-ready PDF with QR to parent portal
15. **Data Backup** â€” Full org JSON export + restore
16. **Public Parent Portal** â€” No-login view via QR scan
17. **Command Palette (âŒ˜K)** â€” Jump to anything
18. **Dark / Light mode** â€” HSL-based, animation-preserving toggle

---

## Technology Stack

**Frontend**: Next.js 15 Â· React 19 Â· Tailwind 4 Â· shadcn/ui Â· framer-motion Â· recharts Â· lucide-react
**Backend**: Next.js API routes Â· MongoDB Â· JWT Â· bcryptjs
**Exports**: jsPDF Â· xlsx (SheetJS) Â· qrcode
**Optional integrations**: Twilio (SMS/WhatsApp, off by default)

Full details in [TECH_STACK.md](docs/TECH_STACK.md).

---

## Contributing / Extending

See [ARCHITECTURE.md Â§ 8](docs/ARCHITECTURE.md#8-extension-points) for common extension points. Key rules:

1. **Never bypass `orgScope()`** â€” tenant isolation is enforced at every query.
2. **Use UUIDs, not ObjectIds** â€” JSON serialization + public tokens.
3. **Soft delete only** â€” never `deleteOne`; set `is_deleted: true`.
4. **New APIs**: prefix all with `/api`.
5. **New env vars**: never hardcode URLs or ports â€” always `process.env.*`.
6. **New shadcn components**: import from `@/components/ui/*`, don't rewrite them.

---

## License & Attribution

Built with devotion for Hare Krishna organizations ðŸ™

---

**Hare Krishna Â· Serve with devotion**

