---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: API Types + Admin Submissions Table

## Objective
Extend `lib/api.ts` with all Phase 4 types and helper methods, then build the admin submissions table page at `/admin/forms/[id]/submissions` — a spreadsheet-style view with search, column sort, status filter, pagination, bulk selection, and a submission detail drawer.

## Context
- .gsd/SPEC.md
- frontend/lib/api.ts (extend)
- frontend/app/(admin)/admin/forms/[id]/page.tsx (pattern reference)
- backend/app/routers/submissions.py (API reference)

## Tasks

<task type="auto">
  <name>Extend api.ts with Phase 4 types and submission endpoints</name>
  <files>frontend/lib/api.ts</files>
  <action>
    Add the following TypeScript interfaces and API methods to lib/api.ts:

    Interfaces to add:
    - SubmissionValue { field_id: string; value_text: string | null; value_json: any }
    - FileUploadRead { id: string; field_id: string; cloudinary_url: string; cloudinary_secure_url: string; original_filename: string; file_type: string; file_size_bytes: number }
    - SubmissionRead { id: string; submission_id: string; form_id: string; status: string; admin_notes: string | null; submitted_at: string; updated_at: string; values: SubmissionValue[]; file_uploads: FileUploadRead[] }
    - PaginatedSubmissions { submissions: SubmissionRead[]; total_count: number; page: number; limit: number; total_pages: number }
    - EditRequestRead { id: string; submission_id: string; reason: string; status: string; admin_note: string | null; edit_token: string | null; token_expires_at: string | null; created_at: string; reviewed_at: string | null; form_name: string; human_submission_id: string }
    - EditRequestFormDetail { form: FormDetailRead; submission_id: string; values: SubmissionValue[]; file_uploads: FileUploadRead[] }

    API methods to add:
    - getSubmissions(formId, params: { page, limit, sort_by, sort_order, search?, status_filter? }, token) → GET /api/submissions/form/{formId}
    - updateSubmissionStatus(id, status, admin_notes?, token) → PATCH /api/submissions/{id}/status
    - bulkUpdateStatus(submission_ids[], status, token) → POST /api/submissions/bulk-status
    - bulkArchive(submission_ids[], token) → POST /api/submissions/bulk-archive
    - getEditRequests(status_filter?, token) → GET /api/submissions/edit-requests
    - approveEditRequest(id, admin_note?, token) → POST /api/submissions/edit-requests/{id}/approve
    - rejectEditRequest(id, admin_note?, token) → POST /api/submissions/edit-requests/{id}/reject
    - createEditRequest(submission_id, reason) → POST /api/submissions/edit-requests (no auth)
    - getSubmissionByToken(token) → GET /api/submissions/edit-by-token/{token} (no auth)
    - applyEditByToken(token, payload) → PATCH /api/submissions/edit-by-token/{token} (no auth)
  </action>
  <verify>npx tsc --noEmit in frontend/ — zero type errors relating to api.ts</verify>
  <done>All Phase 4 types defined; all API methods callable; TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Build Admin Submissions Table page</name>
  <files>
    frontend/app/(admin)/admin/forms/[id]/submissions/page.tsx (NEW)
    frontend/components/admin/submissions/submission-detail-drawer.tsx (NEW)
    frontend/components/admin/submissions/status-badge.tsx (NEW)
  </files>
  <action>
    Create the submissions table page at /admin/forms/[id]/submissions/page.tsx:

    Features:
    1. Topbar: form name + subtitle "Submissions", Back to Builder button, Export CSV button (placeholder for Phase 5)
    2. Filter bar: global search input (debounced 400ms), status filter dropdown (All / Pending / Verified / Approved / Rejected / Completed / Cancelled / Archived), rows-per-page selector (25/50/100)
    3. Spreadsheet table:
       - Columns: checkbox (select all), Submission ID, Status, Submitted At, then each form field label dynamically
       - Column headers are clickable to sort (asc/desc with triangle indicator)
       - Each row: checkbox, submission_id (bold, monospace), status badge (color-coded, clickable dropdown to change status inline), submitted_at (formatted), field values from submission.values (match field_id → value_text or JSON joined)
       - Clicking row background (not checkbox/status) opens detail drawer
    4. Bulk action bar (appears when 1+ rows selected): "Update Status" dropdown + Apply button, "Archive Selected" button, deselect all
    5. Pagination: Previous/Next buttons, page N of M, showing X-Y of Z results
    6. Empty state: large empty state card "No submissions yet"
    7. Loading state: shimmer skeleton rows

    Status badge component (status-badge.tsx):
    - Each status gets distinct Neo-Brutalist color: Pending=yellow, Verified=blue, Approved=green, Rejected=red, Completed=emerald, Cancelled=gray, Archived=slate
    - Style: neo-pill with thick border

    Submission detail drawer (submission-detail-drawer.tsx):
    - Right-side sheet/drawer overlay (Sheet from shadcn or custom)
    - Header: Submission ID (large monospace), Close button
    - Status section: current status badge + dropdown to change status + admin notes textarea + Save button
    - Field values section: each field label → value pair, files as clickable links
    - Submitted At timestamp

    Navigation: Add "Submissions" link to the form builder page topbar actions area linking to /admin/forms/{id}/submissions.

    Neo-Brutalist styling:
    - Table: border-2 border-border, alternating rows with hover highlight
    - Bulk action bar: sticky at bottom with yellow accent background
    - Consistent with existing neo-card, neo-btn, neo-pill classes
  </action>
  <verify>Navigate to /admin/forms/{any-form-id}/submissions — table loads, search filters, clicking header sorts, clicking row opens drawer, status can be changed, bulk select works</verify>
  <done>Submissions table functional with search/sort/filter/pagination/bulk actions and detail drawer; no TypeScript errors</done>
</task>

## Success Criteria
- [ ] All Phase 4 TypeScript types defined in api.ts
- [ ] GET /api/submissions/form/{id} called correctly with all query params
- [ ] Submissions table renders with dynamic columns from form fields
- [ ] Status can be updated inline via drawer
- [ ] Bulk status update and bulk archive work
- [ ] Pagination navigates correctly
