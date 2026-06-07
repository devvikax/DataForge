# REQUIREMENTS.md — DataForge

> Generated from SPEC.md | Status: Active

---

## Functional Requirements

| ID | Requirement | Source | Priority | Status |
|----|-------------|--------|----------|--------|
| REQ-01 | Admin can log in with username + password using JWT authentication | SPEC Goal: Auth | P0 | Completed (Phase 1) |
| REQ-02 | JWT tokens expire and admin is redirected to login on expiry | SPEC Goal: Auth | P0 | Completed (Phase 1) |
| REQ-03 | Admin can create a new form with a name, description, and settings | SPEC Goal 1 | P0 | Completed (Phase 2) |
| REQ-04 | Admin can add fields of types: text, textarea, number, email, phone, date, dropdown, radio, checkbox, file | SPEC Goal 1 | P0 | Completed (Phase 2) |
| REQ-05 | Every field supports: required/optional, placeholder, description, default value | SPEC Goal 1 | P0 | Completed (Phase 2) |
| REQ-06 | Admin can define conditional logic: show/hide fields based on other field values | SPEC Goal 1 | P1 | Completed (Phase 2) |
| REQ-07 | Admin can reorder fields via drag-and-drop in the form builder | SPEC Goal 1 | P1 | Completed (Phase 2) |
| REQ-08 | Admin can manually open or close a form at any time | SPEC Goal 1 | P0 | Completed (Phase 2) |
| REQ-09 | Admin can configure duplicate detection fields per form | SPEC Goal 5 | P0 | Completed (Phase 2) |
| REQ-10 | Admin can edit or delete a form (with confirmation) | SPEC Goal 1 | P1 | Completed (Phase 2) |
| REQ-11 | Public user can open a form via shareable public URL without authentication | SPEC Goal 2 | P0 | Pending |
| REQ-12 | Public form displays a review screen before final submission | SPEC Goal 2 | P0 | Pending |
| REQ-13 | Review screen requires confirmation checkbox before submit | SPEC Goal 2 | P0 | Pending |
| REQ-14 | Successful submission generates unique ID in format DF-YYYY-NNNNNN | SPEC Goal 2 | P0 | Pending |
| REQ-15 | Closed forms display a "submissions closed" message instead of the form | SPEC Goal 2 | P0 | Pending |
| REQ-16 | Duplicate submission is rejected with HTTP 409 and a clear user-facing message | SPEC Goal 5 | P0 | Pending |
| REQ-17 | Public user can submit an edit request using their Submission ID and a reason | SPEC Goal 4 | P0 | Pending |
| REQ-18 | Admin sees all pending edit requests in the dashboard | SPEC Goal 4 | P0 | Pending |
| REQ-19 | Admin can approve or reject an edit request | SPEC Goal 4 | P0 | Pending |
| REQ-20 | Approval generates a UUID-based, time-limited secure edit link (24h TTL) | SPEC Goal 4 | P0 | Pending |
| REQ-21 | Submitter can use the edit link to modify their submission before expiry | SPEC Goal 4 | P0 | Pending |
| REQ-22 | Expired edit links return a clear "link expired" error | SPEC Goal 4 | P0 | Pending |
| REQ-23 | File upload fields accept configurable types (jpg, png, webp, pdf, docx) | SPEC Goal 6 | P0 | Pending |
| REQ-24 | File size and upload count are validated before Cloudinary upload | SPEC Goal 6 | P0 | Pending |
| REQ-25 | Files are uploaded to Cloudinary; only URL + metadata stored in PostgreSQL | SPEC Goal 6 | P0 | Pending |
| REQ-26 | File upload UI supports drag-and-drop and shows upload progress | SPEC Goal 6 | P1 | Pending |
| REQ-27 | Admin submissions table supports search, sort, filter, and pagination | SPEC Goal 3 | P0 | Pending |
| REQ-28 | Admin can perform bulk actions on selected submissions (status update, export, archive) | SPEC Goal 3 | P1 | Pending |
| REQ-29 | Admin can update submission status individually | SPEC Goal 3 | P0 | Pending |
| REQ-30 | Admin can export submissions as CSV and XLSX | SPEC Goal 8 | P0 | Pending |
| REQ-31 | Export preserves column order, field labels, and formatting | SPEC Goal 8 | P0 | Pending |
| REQ-32 | Admin can generate one-click Nominal Roll and Registration List reports | SPEC Goal 8 | P1 | Pending |
| REQ-33 | Analytics dashboard shows total submissions, daily count, approval rate | SPEC Goal 7 | P0 | Pending |
| REQ-34 | Analytics shows response trends over time (line chart), category distributions (pie/bar) | SPEC Goal 7 | P1 | Pending |
| REQ-35 | Field-level statistics are available for dropdown/radio/checkbox fields | SPEC Goal 7 | P1 | Pending |
| REQ-36 | Full stack runs via `docker-compose up` on a local machine | SPEC Constraint | P0 | Completed (Phase 1) |

---

## Non-Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| NFR-01 | Public form pages load in under 2 seconds on standard connection | P1 | Pending |
| NFR-02 | Admin dashboard is fully responsive down to 768px viewport | P1 | Completed (Phase 2) |
| NFR-03 | All form inputs meet WCAG 2.1 AA accessibility standards | P1 | Pending |
| NFR-04 | Admin JWT secret is stored in environment variable, never hardcoded | P0 | Completed (Phase 1) |
| NFR-05 | Database credentials are stored in environment variables | P0 | Completed (Phase 1) |
| NFR-06 | Cloudinary credentials are stored in environment variables | P0 | Pending |
| NFR-07 | API follows RESTful conventions with consistent error response schema | P1 | Completed (Phase 2) |
| NFR-08 | All database operations use SQLAlchemy ORM (no raw SQL except analytics) | P1 | Completed (Phase 2) |
| NFR-09 | Alembic migrations track all schema changes | P0 | Completed (Phase 1) |
| NFR-10 | Backend includes input sanitization to prevent SQL injection and XSS | P0 | Pending |
