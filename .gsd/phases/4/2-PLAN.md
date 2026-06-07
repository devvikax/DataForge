---
phase: 4
plan: 2
wave: 2
---

# Plan 4.2: Edit Requests Admin UI

## Objective
Build the admin Edit Requests dashboard at `/admin/edit-requests` — a tabbed interface (Pending / Approved / Rejected) with approve/reject actions, admin note input, and generated edit link display with copy button.

## Context
- .gsd/SPEC.md (Edit Request Flow section)
- frontend/lib/api.ts (EditRequestRead type)
- frontend/app/(admin)/admin/forms/page.tsx (pattern reference)
- backend/app/routers/submissions.py (approve/reject endpoints)

## Tasks

<task type="auto">
  <name>Build Admin Edit Requests page</name>
  <files>
    frontend/app/(admin)/admin/edit-requests/page.tsx (NEW)
    frontend/components/admin/edit-requests/edit-request-card.tsx (NEW)
  </files>
  <action>
    Create page at /admin/edit-requests/page.tsx:

    Layout:
    1. AdminTopbar: title="Edit Requests", subtitle="Review and manage submission edit requests"
    2. Tabs: Pending | Approved | Rejected (count badge on each tab)
    3. Each tab shows a list of EditRequestCard components filtered by status
    4. Loading skeleton while fetching
    5. Empty state per tab ("No pending requests", etc.)

    EditRequestCard component (edit-request-card.tsx):
    - Neo-Brutalist card with left accent border (yellow=pending, green=approved, red=rejected)
    - Shows: Form Name, Submission ID (monospace bold), Request Reason (text, full), Submitted date
    - For Pending tab:
      - Admin note textarea (optional)
      - Two buttons: "✓ Approve" (green neo-btn) and "✗ Reject" (red neo-btn)
      - On approve: calls api.approveEditRequest, shows generated edit link with copy button
      - On reject: calls api.rejectEditRequest, card moves to Rejected tab on next load
    - For Approved tab:
      - Show edit token link: /edit/{token} (full URL with copy button)
      - Show expiry: "Expires {date}" with countdown indicator
      - Status badge: "APPROVED"
    - For Rejected tab:
      - Show admin note if present
      - Status badge: "REJECTED"

    After approve/reject action: reload edit requests list (setRequests → re-fetch).

    Add "Edit Requests" to the admin sidebar navigation (between Forms and future Analytics).
    Update frontend/components/admin/sidebar.tsx to add the new nav item.

    Sidebar nav item: icon=📩, label="Edit Requests", href="/admin/edit-requests"

    Neo-Brutalist styling: consistent with existing pages, use neo-card, neo-btn, neo-pill classes.
  </action>
  <verify>Navigate to /admin/edit-requests — tabs visible, pending requests shown, approve triggers token display with copy button, reject moves to rejected tab</verify>
  <done>Edit Requests page functional with all three status tabs; approve generates and displays edit token link; reject closes request with optional note</done>
</task>

## Success Criteria
- [ ] /admin/edit-requests page renders with Pending/Approved/Rejected tabs
- [ ] Approve action generates token and displays copyable edit link
- [ ] Reject action stores admin note and closes request
- [ ] Sidebar updated with Edit Requests nav link
- [ ] No TypeScript errors
