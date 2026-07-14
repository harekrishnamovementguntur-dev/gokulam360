# Gokulam360 — User Manual

> **For**: Org Admins, Teachers, and Parents
> **Version 1.0** · June 2025

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Dashboard](#2-the-dashboard)
3. [Managing Students](#3-managing-students)
4. [Bulk Import Students](#4-bulk-import-students)
5. [Managing Teachers](#5-managing-teachers)
6. [Classes & Batches](#6-classes--batches)
7. [Enrollment History & Renewals](#7-enrollment-history--renewals)
8. [Marking Attendance](#8-marking-attendance)
9. [Cancelling a Session](#9-cancelling-a-session)
10. [Fees Management](#10-fees-management)
11. [WhatsApp Notifications](#11-whatsapp-notifications)
12. [Reports & Exports](#12-reports--exports)
13. [ID Cards + Parent QR](#13-id-cards--parent-qr)
14. [Events](#14-events)
15. [Data Backup & Restore](#15-data-backup--restore)
16. [Command Palette (⌘K)](#16-command-palette-k)
17. [Parent Portal (Public + Login)](#17-parent-portal-public--login)
18. [FAQ](#18-frequently-asked-questions)

---

## 1. Getting Started

### 1.1 Signing in

Open the platform URL provided by your Super Admin. On the login page:

1. Enter your **email** and **password**.
2. Click **Sign in**.
3. First-time users can click one of the demo chips to auto-fill credentials.

### 1.2 The four roles

| Role | What you can do |
|------|-----------------|
| **Super Admin** | Create/manage organizations, view platform-wide analytics |
| **Org Admin** | Full access to your school's students, teachers, fees, notifications, backup |
| **Teacher** | View students, mark attendance |
| **Parent** | View your own child's attendance, fees, sessions |

### 1.3 Global navigation

- **Sidebar** (left): main modules. Active item is highlighted in gradient.
- **Header search / ⌘K**: jump to any student, teacher, or module.
- **Sun/Moon icon**: toggle dark mode.
- **User avatar** (bottom-left): logout.

---

## 2. The Dashboard

After signing in, you land on the dashboard:

- **Greeting hero**: personalized welcome + 4 quick-action buttons (Add Student, Mark Attendance, Send Notification, View Reports).
- **KPI cards**: Total Students, Attendance %, Pending Fees, Teacher count. Numbers animate in.
- **Monthly Admissions**: area chart of last 6 months.
- **Attendance ring**: overall attendance % with active/inactive breakdown.
- **Attendance Heatmap**: 12-week × 7-day grid, darker = better attendance.
- **Recent Activity**: timeline of the last 30 actions in your org.
- **Upcoming Events**: next 5 events.
- **Daily Inspiration**: motivational Bhagavad Gita quote.

---

## 3. Managing Students

### 3.1 Add a student

1. Sidebar → **Students** → **Add Student**.
2. Fill **Personal** tab: name, DOB, gender, mobile, email, address.
3. Fill **Family** tab: father, mother, guardian, emergency contact.
4. Scroll to the multi-class picker and check the classes to enroll them in.
5. Click the camera icon on the avatar to upload a photo (JPG/PNG, ≤800KB).
6. Click **Create**. A confetti burst confirms 🎉 and:
   - An enrollment record is created for each selected class
   - A **Term Fee** record is auto-generated for each class (using its fee_amount)
   - A **public token** is generated for the QR/parent portal

### 3.2 Edit or delete

- Hover a student card → **Edit** pencil / **Delete** trash icons.
- Deletes are soft (`is_deleted: true`) — no history lost.

### 3.3 Filter & search

- Search bar filters by name, ID, or email.
- Status tabs: All / Active / Inactive / Left with counts.

---

## 4. Bulk Import Students

1. Sidebar → **Students** → **Import** button.
2. Click **Download Excel template** — you get a pre-filled sample.
3. Fill your Excel with columns: `first_name, last_name, dob, gender, mobile, email, father_name, mother_name, emergency_contact, address, program, status`.
4. `program` must match an existing class name (case-insensitive).
5. Drag & drop the file into the upload zone, or click to browse.
6. Preview table shows the first 50 rows.
7. Click **Import N students** — confetti + activity log entry.

---

## 5. Managing Teachers

Sidebar → **Teachers** → **Add Teacher**. Fields: Employee ID (auto-generated), name, email, mobile, qualification, skills, address. Same edit/delete pattern as students.

---

## 6. Classes & Batches

### 6.1 Create a class

1. Sidebar → **Classes & Batches** → **New Class**.
2. Fill:
   - **Name** (e.g. "Sunday School Term 2")
   - **Description**
   - **Class Days** — tap the 7-day picker (Sun/Mon/Tue/Wed/Thu/Fri/Sat). Selected days highlight in gradient.
   - **Fee** (per term)
   - **Age Group**, **Duration**, **Capacity**
   - **Start Date** and **End Date**
3. Click **Create**.
4. Sessions are **auto-generated** — every matching day-of-week between start and end.

### 6.2 What each card shows

- Purple day pills: which days the class runs
- Enrolled / Capacity / Fee
- Fill-rate progress bar
- Start → End date
- Weekly frequency (e.g. "2 days/wk")
- Hover to reveal Edit / Delete

---

## 7. Enrollment History & Renewals

### 7.1 View history

On any student card → **History** button. The drawer shows:

- **Active enrollments**: each class with sessions used / credited progress bar
- **History**: past enrollments (left/completed) with dates preserved

### 7.2 Session-quota system

When a student is enrolled, they're credited with the number of remaining sessions in that class from their enrollment date to the class end date. Every **present** or **late** attendance uses **one credit**.

### 7.3 Carry-over

If the class term ends but the student still has unused credits, the drawer shows: 📚 *"N unused sessions carrying over from previous term"* — they can keep attending the next term for free until credits run out.

### 7.4 Renew a term

When credits hit 0, click **Renew term** → confirmation → the current enrollment is marked `completed`, a fresh enrollment is created with a new quota, and a new **Term Fee (Renewal)** is auto-generated.

---

## 8. Marking Attendance

1. Sidebar → **Attendance**.
2. Pick a **Class** from the dropdown.
3. The **Sessions strip** appears — a horizontal row of every auto-generated session:
   - 🟢 Green with ✓ = already marked (shows `present/total`)
   - 🟠 Amber outline = today
   - ⬜ Gray = past unmarked
   - 🟪 Saffron gradient = **currently selected**
4. Today's session is auto-selected. Click any pill to switch.
5. For each student:
   - Click one of: **Present / Absent / Late / Excused**
   - The row shows their remaining credits (e.g. "14/18 sessions left")
   - If quota is exhausted, the row is grayed with a **Quota done** badge
6. Use **Mark all Present** / **Mark all Absent** for bulk actions.
7. Click **Save Attendance** — confetti confirms.

### 8.1 Editing past attendance

Select a past session pill — existing marks load automatically. Change any and click **Save** to overwrite.

---

## 9. Cancelling a Session

Use this for holidays, teacher absence, or unexpected closures.

1. In the **Attendance** page, hover over a future unmarked session pill.
2. A small red **✕** appears at the top-right of the pill.
3. Click it → confirm.
4. The session is removed from the schedule and **doesn't count against session quotas**.

Cancelled dates are stored in `program.cancelled_dates` and can be restored via API if needed.

---

## 10. Fees Management

### 10.1 Overview

Sidebar → **Fees**. See:

- **Total Collected** (emerald card)
- **Pending Dues** (rose card)
- **Collection Rate** with progress
- Full table of every fee record

### 10.2 Mark as paid

For any pending row → **Mark Paid** button. Confetti + toast. Amount moves to Collected.

### 10.3 Auto-generated fees

Every time a student enrolls in a class, a Term Fee is created automatically with the class's `fee_amount`. Renewals also auto-generate a **Term Fee (Renewal)**.

---

## 11. WhatsApp Notifications

### 11.1 Compose

1. Sidebar → **Notifications**.
2. Pick a **Template**: Fee reminder, Birthday wish, Event announcement, Attendance update, Low session quota alert, or Custom.
3. Pick **Recipients**:
   - **All active students** — every enrolled student's parent
   - **First 5** — for testing
   - **🔔 Low session quota** — auto-detects students with ≤3 credits left
   - **Choose individually** — checkbox picker
4. Message textarea auto-fills from the template. Edit as needed.
5. Preview appears on the right — mock WhatsApp phone.

### 11.2 Send

Two options:

- 💚 **Open all N chats** — opens WhatsApp Web / app in N new tabs, each pre-filled with your message and the parent's number. Just hit Send in each. 350ms stagger prevents browser popup blocking.
- 👤 **Per-recipient Send button** — for one-off sends.

Each sent recipient turns green with **✓ Sent** in the roster below. Notification History log preserves everything.

### 11.3 Why free?

This uses `wa.me/{phone}?text=…` deep-links — no Twilio, no monthly fees. Messages go from your personal/business WhatsApp, feels human, works from day 1.

---

## 12. Reports & Exports

### 12.1 Available reports

- **Students** — full roster with ID, name, contact, status
- **Attendance** — every marked session
- **Monthly Summary** — per-student overall % + per-month heatmap table with top performers & needs-attention panels
- **Fees** — full fee ledger

### 12.2 Export

Each report page has three buttons in the header:
- **CSV** — universal, opens in Excel/Sheets
- **Excel** — .xlsx via `xlsx` library
- **PDF** — branded PDF with header logo & orientation-aware layout

---

## 13. ID Cards + Parent QR

### 13.1 Generate

1. Students → hover a card → **ID Card** button.
2. Modal shows a beautiful mini card preview.
3. Click **Download PDF** to save a print-ready 54×86mm ID card.

### 13.2 What's on the card

- **Header**: GOKULAM360 logo (violet gradient) + org name
- **Photo box** (top-left)
- **Student details** (top-right): Name, ID, Emergency contact
- **QR code** (bottom-left) → links to `/p/{public_token}` — scan with phone camera → instant parent view (no login)
- **Enrolled Classes** (bottom-right): list of all class names
- **Footer band**: "Hare Krishna · Serve with devotion"

Print on standard cardstock, laminate, hand out to parents.

---

## 14. Events

Sidebar → **Events** → **New Event**. Fields: name, date, description. Beautiful gradient card banners auto-styled per event. Upcoming events also appear on the dashboard.

---

## 15. Data Backup & Restore

### 15.1 Export

1. Sidebar → **Backup**.
2. Click **Export as JSON** (purple card).
3. A timestamped file downloads: `gokulam360-backup-YYYY-MM-DD-HH-MM-SS.json`
4. Contains everything: organizations, students, teachers, programs, attendance, fees, events, notifications, activity.

### 15.2 Restore

1. Same page → **Upload backup file** (rose card).
2. Confirm the destructive prompt.
3. Your org's data is **replaced** with the file's contents.

### 15.3 Recommended cadence

- Weekly (after Sunday class)
- Before term rollover
- Before bulk imports
- Keep an off-site copy in Google Drive or email

---

## 16. Command Palette (⌘K)

Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) anywhere. A search dialog appears with:

- **Navigate** — jump to any module
- **Students** — search & jump to any student
- **Teachers** — search & jump to any teacher

Type to filter. Enter to select.

---

## 17. Parent Portal (Public + Login)

### 17.1 Public QR link (no login)

Parents scan the QR on the ID card. They see:
- Photo + name + student ID
- Attendance % + progress bar
- Fees paid vs dues
- All enrolled classes with session progress
- Recent 10 attendance entries
- Full fee history
- Org contact info

URL format: `${BASE_URL}/p/{public_token}`. No credentials needed. Token is a UUID — impossible to guess.

### 17.2 Full parent login

Parents with a login account (created by admin) see a richer view via `parent@... / password`. Similar layout with dark mode toggle + logout.

---

## 18. Frequently Asked Questions

**Q: A student joined mid-term. Do they still pay full fee?**
A: Yes. They're credited with only the *remaining* sessions from their join date, but any unused sessions **carry over to the next term automatically** — they get their full 16 lessons wherever they happen.

**Q: Can a student be in multiple classes?**
A: Yes. Check multiple classes in the enrollment picker. Each generates its own enrollment record and its own Term Fee.

**Q: What if the teacher is sick?**
A: Go to Attendance → hover the affected session → click the ✕ to cancel it. That session no longer counts against any student's quota.

**Q: I marked attendance wrong. Can I fix it?**
A: Yes. Reselect the session in the strip — existing marks load. Change and click Save.

**Q: How do I hand a parent access to their child's info without creating an account?**
A: Download the ID card. It has a QR code — scanning it opens the public parent view.

**Q: WhatsApp blocked my browser from opening 22 tabs.**
A: Allow popups for this site once. Or use "First 5" as target for testing.

**Q: I accidentally deleted a student.**
A: Deletes are soft. Restore via database: `db.students.updateOne({id: '...'}, {$set: {is_deleted: false}})`. Or restore from your latest JSON backup.

**Q: How do I add another organization?**
A: Log in as Super Admin → Organizations → **New Organization** → walk through the 7-step wizard.

**Q: Where do I change the organization name / phone?**
A: Currently via the Organizations wizard (edit) or directly via Super Admin. Org self-service edit is planned.

**Q: How do I renew everyone at term start?**
A: Currently one-by-one via History drawer. Bulk term rollover is planned.

---

**End of User Manual · Hare Krishna 🙏**
