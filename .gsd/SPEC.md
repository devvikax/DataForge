# SPEC.md — DataForge Project Specification

> **Status**: `FINALIZED`
> **Created**: 2026-06-07
> **Owner**: Administrator (Single-user system, v1)

---

## Vision

DataForge is a powerful, self-hosted personal form creation, data collection, and spreadsheet automation platform that replaces the fragmented workflow of Google Forms, Excel Sheets, and manual data management. It provides a single administrator-controlled environment to build unlimited custom forms, collect structured public submissions, detect duplicates, manage edit requests, and export rich reports — all wrapped in a professional Neo-Brutalist UI that feels like a premium combination of Google Forms, Airtable, and Excel.

---

## Goals

1. **Form Builder** — Provide a dynamic drag-and-drop form builder supporting 10+ field types, conditional logic, validation rules, and custom duplicate-detection policies per form.
2. **Public Submission Workflow** — Enable unauthenticated public users to fill, review, and submit forms reliably, receiving a unique Submission ID (e.g., `DF-2026-000001`) on success.
3. **Spreadsheet-Style Data Management** — Deliver an Excel-like admin submissions table with search, sort, filter, pagination, bulk actions, status management, and CSV/XLSX export.
4. **Edit Request Workflow** — Allow submitters to request edits via a reason-based workflow; admin can approve or reject, generating a secure temporary edit link on approval.
5. **Duplicate Detection** — Configurable per-form unique field constraints (email, phone, roll number, or any custom field) with clear rejection messaging.
6. **File Upload via Cloudinary** — Support drag-and-drop uploads (images, PDFs, documents) stored on Cloudinary with metadata in PostgreSQL; validate types, sizes, and limits.
7. **Analytics Dashboard** — Auto-generate charts (Recharts) for submission trends, approval rates, category distributions, field-level stats, and daily counts.
8. **Report Generation** — One-click export of Nominal Rolls, attendance sheets, registration lists, and printable reports in CSV and XLSX.

---

## Non-Goals (Explicitly Out of Scope — v1)

- Payment processing or billing features
- AI/ML modules (smart autofill, NLP, predictions)
- Multi-organization / multi-tenant workspaces
- WhatsApp / SMS / Email notification integrations
- QR-code attendance scanning systems
- Advanced SaaS billing or subscription tiers
- Mobile native apps (iOS/Android)
- Real-time collaborative editing
- Custom domain support or white-labeling
- Role-based access control (RBAC) beyond single admin

---

## Users

### Administrator (Single User — v1)
- The sole user with a secured JWT-authenticated dashboard login.
- Creates and manages all forms, reviews submissions, approves/rejects edit requests, exports data, and monitors analytics.
- Uses the platform daily as a personal productivity and data operations tool.

### Public Submitters (Unauthenticated — Unlimited)
- Anyone with a public form link can open, fill, review, and submit a form.
- No registration, no login required.
- Receives a Submission ID after successful submission.
- Can initiate an edit request using their Submission ID.
- Cannot directly edit their submission.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI |
| Backend | Python FastAPI |
| Database | PostgreSQL (primary structured store) |
| ORM | SQLAlchemy + Alembic (migrations) |
| File Storage | Cloudinary (images, PDFs, documents) |
| Authentication | JWT (admin only, single account) |
| Charts | Recharts (frontend) |
| Export | openpyxl + csv (backend) |
| Containerization | Docker + Docker Compose (local dev) |

---

## Design Language

- **Style**: Neo-Brutalist — strong borders, high contrast, bold typography, grid-based layouts
- **Responsive**: Mobile-first, fully responsive admin and public surfaces
- **Accessible**: WCAG 2.1 AA compliant form inputs, keyboard navigation, ARIA labels
- **Interactions**: Smooth transitions, micro-animations, drag-and-drop with visual feedback
- **Color palette**: High-contrast neutrals with strong accent (admin: dark, public: clean white/cream)

---

## Database Schema (Core Tables)

| Table | Purpose |
|---|---|
| `users` | Single admin account with hashed password + JWT |
| `forms` | Form metadata, status (open/closed), duplicate config |
| `form_fields` | Field definitions: type, label, validation, order, conditions |
| `submissions` | Each public submission with unique ID (DF-YYYY-NNNNNN) |
| `submission_values` | EAV-style field values per submission |
| `edit_requests` | Edit request with reason, status, temporary token |
| `file_uploads` | Cloudinary URL, metadata, linked to submission |
| `analytics_cache` | Pre-computed aggregates for dashboard performance |

---

## Submission ID Format

- Pattern: `DF-{YEAR}-{6-digit-zero-padded-sequence}`
- Example: `DF-2026-000001`, `DF-2026-000042`
- Sequence resets per form (not global), keyed by form + year

---

## Submission Statuses

`Pending` → `Verified` → `Approved` → `Completed`
`Pending` → `Rejected`
`Any` → `Cancelled` | `Archived`

---

## Edit Request Flow

1. Submitter enters their Submission ID on the public site
2. Submitter writes a reason for the edit request
3. Admin reviews pending requests in the dashboard
4. On **Approval**: system generates a UUID-based secure token, creates a time-limited edit URL (e.g., expires in 24 hours)
5. Admin shares the link with the submitter (manual, v1)
6. Submitter uses the link to modify their submission before expiry
7. On **Rejection**: request is closed with optional admin note

---

## Duplicate Detection

- Configured per form (not globally)
- Admin selects which fields must be unique: email, phone, roll number, or any custom field marked as "unique key"
- On submission, backend checks all configured unique fields against existing submissions for that form
- If duplicate found: reject with HTTP 409, return clear user-facing message with field name

---

## File Upload Constraints

- Accepted types: images (jpg, png, webp), documents (pdf, docx), max configurable per field
- Max file size: configurable per field (default 5MB)
- Upload count: configurable per field (default 1 file)
- Upload flow: frontend → backend validation → Cloudinary SDK → store URL in PostgreSQL

---

## Constraints

- **Single admin account** — no user registration, no invite system in v1
- **Self-hosted first** — designed for local Docker deployment, not cloud SaaS
- **No automatic form expiry** — admin manually opens/closes forms
- **No email delivery** — edit links shared manually by admin in v1
- **PostgreSQL required** — no SQLite fallback; structured data demands relational integrity

---

## Success Criteria

- [ ] Admin can create a form with 10+ field types and conditional logic
- [ ] Public user can submit a form without authentication and receive a Submission ID
- [ ] Duplicate submissions are detected and rejected with a clear message
- [ ] Admin can review, approve, or reject edit requests and generate temporary edit links
- [ ] Files are uploaded to Cloudinary, URLs stored in PostgreSQL
- [ ] Admin dashboard displays submissions in sortable, filterable, paginated table
- [ ] Admin can export submissions as CSV and XLSX
- [ ] Analytics dashboard renders charts for trends, rates, and distributions
- [ ] One-click Nominal Roll / Registration List report generation works
- [ ] Full stack runs locally via `docker-compose up`
