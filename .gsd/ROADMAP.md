# ROADMAP.md — DataForge

> **Project**: DataForge — Personal Form Creation & Data Collection Platform
> **Current Phase**: Phase 5 — Analytics, Export & Reporting
> **Milestone**: v1.0 — Full Single-Admin Platform

---

## Must-Haves (from SPEC)

- [ ] JWT Admin Authentication
- [ ] Dynamic Form Builder (10+ field types + conditional logic)
- [ ] Public Submission Workflow (review screen + Submission ID)
- [ ] Configurable Duplicate Detection per form
- [ ] Edit Request Workflow (reason → approval → secure temporary link)
- [ ] Cloudinary File Uploads with validation
- [ ] Spreadsheet-style Submissions Table (search, sort, filter, paginate, bulk actions)
- [ ] Submission Status Management
- [ ] CSV + XLSX Export
- [ ] Analytics Dashboard with Recharts
- [ ] Docker Compose local deployment

---

## Phases

---

### Phase 1: Project Foundation & Infrastructure
**Status**: ⬜ Not Started
**Objective**: Stand up the full development environment — monorepo structure, Docker Compose, database schema, FastAPI skeleton, Next.js skeleton, and admin authentication. By the end of this phase, an admin can log in and the API is reachable.

**Deliverables**:
- Monorepo directory structure (`/frontend`, `/backend`, `/docker`)
- `docker-compose.yml` with services: `postgres`, `backend` (FastAPI), `frontend` (Next.js)
- `.env.example` files for frontend and backend
- FastAPI project skeleton with `app/`, routers, models, schemas, config
- SQLAlchemy models for all 8 core tables
- Alembic initial migration
- Next.js 14 App Router skeleton with TypeScript + Tailwind CSS + ShadCN UI configured
- Neo-Brutalist global design system (colors, typography, components)
- Admin login page (JWT-based, single account seeded via env vars)
- Protected `/admin` route group with auth middleware
- Admin sidebar/shell layout with navigation
- Health check API endpoint

**Requirements**: REQ-01, REQ-02, REQ-36, NFR-04, NFR-05, NFR-09

---

### Phase 2: Form Builder
**Status**: ✅ Complete
**Objective**: Build the complete form creation and management experience in the admin dashboard. Admin can create, edit, publish, and close forms with full field configuration and conditional logic.

**Deliverables**:
- Form Builder UI: drag-and-drop field canvas
- Field palette with all 10 field types (text, textarea, number, email, phone, date, dropdown, radio, checkbox, file)
- Per-field property panel: label, placeholder, description, default value, required toggle
- Conditional logic editor: show/hide field when another field equals a value
- Duplicate detection configuration: select unique fields per form
- File upload field configuration: accepted types, max size, max count
- Form settings: name, description, open/close toggle
- Forms list page: table of all forms with status badges and actions
- Form preview mode (renders exactly like the public form)
- FastAPI CRUD endpoints: `POST /forms`, `GET /forms`, `GET /forms/{id}`, `PATCH /forms/{id}`, `DELETE /forms/{id}`
- FastAPI field endpoints: `POST /forms/{id}/fields`, `PUT /forms/{id}/fields/reorder`
- Form slug / public URL generation

**Requirements**: REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10

---

### Phase 3: Public Submission Workflow & File Uploads
**Status**: ✅ Complete
**Objective**: Build the complete public-facing form experience — rendering, conditional logic evaluation, review screen, duplicate detection, Cloudinary file uploads, and Submission ID generation.

**Deliverables**:
- Public form page: `/f/[slug]` — renders form from API, no auth required
- Dynamic field rendering for all 10 field types
- Client-side conditional logic evaluation (show/hide fields in real time)
- Client-side form validation before proceeding to review
- Review screen: display all entered values with field labels, confirmation checkbox
- Submission API: `POST /submissions/{form_id}` — validates, deduplicates, assigns Submission ID, persists
- Duplicate detection engine (backend): configurable per-form unique field checks → HTTP 409 + user-facing message
- Submission ID generation: `DF-{YEAR}-{zero-padded-6-digit-per-form-sequence}`
- Submission success page with large Submission ID display and save/copy prompt
- "Submissions closed" page for inactive forms
- Cloudinary file upload endpoint: `POST /uploads` — validates type + size → uploads to Cloudinary → returns URL
- Drag-and-drop file upload component with progress indicator
- File metadata storage in `file_uploads` table

**Requirements**: REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-23, REQ-24, REQ-25, REQ-26

---

### Phase 4: Admin Submissions Management & Edit Requests
**Status**: ✅ Complete
**Objective**: Build the Excel-style submissions table for the admin, full status management, and the complete edit request workflow (submit request → admin review → approve/reject → secure edit link).

**Deliverables**:
- Admin submissions table: columns auto-generated from form fields
- Search (global text), column sort, advanced filter panel (per-field), pagination
- Submission detail drawer/modal: view all field values + file links
- Submission status selector: Pending, Verified, Approved, Rejected, Completed, Cancelled, Archived
- Bulk selection with bulk status update and bulk archive
- Edit Request — public-facing: `/edit-request` page where user enters Submission ID + reason → `POST /edit-requests`
- Edit Requests — admin list: pending/approved/rejected tabs, review panel
- Approve action: generates UUID token, sets TTL (24h), returns edit link
- Reject action: stores admin note, closes request
- Secure edit page: `/edit/[token]` — loads submission, validates token + expiry, renders editable form
- Edit submission API: `PATCH /submissions/{id}/edit` with token validation
- Expired/invalid token page

**Requirements**: REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-27, REQ-28, REQ-29

---

### Phase 5: Analytics, Export & Reporting
**Status**: ✅ Complete
**Objective**: Deliver the analytics dashboard with Recharts visualizations and the complete export/reporting engine (CSV, XLSX, Nominal Roll, Registration List).

**Deliverables**:
- Analytics dashboard page per form
- KPI cards: total submissions, today's count, approval rate, pending count
- Line chart: daily submission trend (last 30 days)
- Bar chart: submissions by status
- Pie chart: category/field distribution for dropdown/radio/checkbox fields
- Field-level stats: top values, unique count, response rate for each field
- Analytics API: `GET /forms/{id}/analytics` — returns pre-computed + live aggregates
- CSV export: `GET /forms/{id}/export/csv` — all submissions, all fields, headers
- XLSX export: `GET /forms/{id}/export/xlsx` — formatted workbook, column widths, bold headers
- Nominal Roll report: sequential numbered list with configurable columns
- Registration List report: filtered view (e.g., Approved only) formatted for print
- Export preserves column order matching form field order
- Print-friendly CSS for report pages

**Requirements**: REQ-30, REQ-31, REQ-32, REQ-33, REQ-34, REQ-35, NFR-01, NFR-07

---

### Phase 6: Functionality Audit and Production-Ready MVP Implementation
**Status**: ⬜ Not Started
**Objective**: Perform a complete functional audit of the entire DataForge system (end-to-end user flows, dynamic fields storage, submissions, duplicate detection, edit requests, dashboard buttons, exports, charts, and API logic). Identify and replace all UI placeholders, broken APIs, and mock data with real database-driven functionality. Generate a detailed audit report, and systematically fix/verify all gaps to achieve a production-ready MVP.
**Depends on**: Phase 5

**Deliverables**:
- Detailed Functional Audit Report (Fully Working, Partially Working, Placeholders, Broken, Missing MVP features)
- End-to-end verified dynamic Form Builder (drag-and-drop, full field types persist/render)
- Fully functional submission flow, duplicate detection, review step, and edit requests
- Production-ready admin dashboard with zero non-functional buttons, placeholders, or broken endpoints
- Database-backed analytics charts, correct status transitions, and robust CSV/Excel exports
- End-to-end automated and manual verification proofs for all fixes

---

## Phase Dependencies

```
Phase 1 (Foundation)
    └── Phase 2 (Form Builder)
            └── Phase 3 (Public Submission)
                    └── Phase 4 (Submissions Management + Edit Requests)
                            └── Phase 5 (Analytics + Export)
                                    └── Phase 6 (Functional Audit + MVP)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Conditional logic complexity in client-side evaluation | Medium | High | Define a simple JSON schema for conditions; evaluate with a pure function |
| Cloudinary upload failures mid-submission | Medium | High | Upload files before form submission; only submit if all files uploaded |
| EAV model performance for large submissions tables | Low | Medium | Index submission_id + field_id; add analytics caching layer |
| XLSX export memory usage for very large datasets | Low | Medium | Stream XLSX generation; paginate backend processing |
| Docker networking issues between Next.js and FastAPI | Low | Medium | Define service names in docker-compose; use internal DNS |
