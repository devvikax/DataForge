---
phase: 4
plan: 3
wave: 3
---

# Plan 4.3: Public Edit Request Submission + Secure Edit Page

## Objective
Build two public-facing pages: (1) `/edit-request` — where a submitter enters their Submission ID and a reason to request an edit; (2) `/edit/[token]` — the secure edit page that loads the original submission, allows modification, and saves via the token API.

## Context
- .gsd/SPEC.md (Edit Request Flow section, sections 1-7)
- frontend/app/f/[slug]/page.tsx (public form rendering pattern)
- frontend/lib/api.ts (createEditRequest, getSubmissionByToken, applyEditByToken)
- backend/app/routers/submissions.py (edit-by-token endpoints)

## Tasks

<task type="auto">
  <name>Build public Edit Request submission page</name>
  <files>frontend/app/edit-request/page.tsx (NEW)</files>
  <action>
    Create page at /edit-request/page.tsx:

    This is a PUBLIC page (no auth required).

    Layout (clean white/cream public style matching /f/[slug]):
    1. DataForge header logo/brand
    2. Card centered on page: 
       - Title: "Request a Submission Edit"
       - Subtitle: "Enter your Submission ID and describe why you need to edit your submission."
    3. Form fields:
       - Submission ID input (text, placeholder "DF-2026-000001", required)
       - Reason textarea (placeholder "Please explain why you need to edit your submission...", required, min 10 chars)
       - Submit button: "Submit Edit Request"
    4. Success state (after submission):
       - Large checkmark icon
       - "Request Submitted!" heading
       - "Your edit request has been received. The administrator will review it and share an edit link with you if approved."
       - Submission ID displayed prominently
    5. Error states:
       - Submission ID not found: "Submission ID not found. Please check and try again."
       - Pending already exists: "You already have a pending edit request for this submission."
       - Generic errors: toast notification

    Call api.createEditRequest(submission_id, reason) on submit.
    Page has no auth guard — fully public.
    
    Style: Matches public form page aesthetic (cream/white bg, clean typography, neo-brutalist borders).
  </action>
  <verify>Navigate to /edit-request, fill Submission ID + reason, submit → success state shows; submit with invalid ID → error message shows</verify>
  <done>Edit request form submits successfully and shows meaningful success/error states; API call verified</done>
</task>

<task type="auto">
  <name>Build secure token-based edit page</name>
  <files>frontend/app/edit/[token]/page.tsx (NEW)</files>
  <action>
    Create page at /edit/[token]/page.tsx:

    This is a PUBLIC page (no auth required). Token is from URL params.

    On mount: call api.getSubmissionByToken(token)
    - If valid: render the form with pre-filled values
    - If expired (400 + "expired"): render "Link Expired" error state
    - If already used (400 + "already been used"): render "Link Used" error state  
    - If invalid (404): render "Invalid Link" error state

    When form data loads (EditRequestFormDetail with form, submission_id, values, file_uploads):
    1. Render a header: "Edit Your Submission — {form.name}", submission ID badge
    2. Render the form exactly like /f/[slug] does:
       - All form fields rendered dynamically
       - Pre-populate each field with the existing submission value (match field_id from values array)
       - Client-side conditional logic evaluation (same as public form)
       - File upload fields show existing file links
    3. Review step: show all values, confirmation checkbox "I confirm these are my updated details"
    4. Submit: call api.applyEditByToken(token, { values: [...], file_uploads: [...] })
    5. Success state:
       - "Submission Updated!" heading
       - "Your submission has been successfully updated. Your Submission ID remains unchanged."
       - Show original submission ID
    6. Token expiry countdown warning: if token expires in < 1 hour, show yellow warning banner

    Error states (full-page, not inline):
    - Expired: large clock icon, "This Edit Link Has Expired", "Edit links are valid for 24 hours. Please contact the administrator to request a new one."
    - Used: large checkmark icon, "This Edit Link Has Already Been Used", friendly message
    - Invalid: large error icon, "Invalid Edit Link", "This link doesn't exist or has been revoked."

    Reuse field rendering logic from the public form page (extract to shared component if needed or replicate the pattern).
  </action>
  <verify>Navigate to /edit/{valid-token} → form pre-filled with existing values; submit updates → success state; navigate to /edit/invalid-token → invalid error state</verify>
  <done>Secure edit page loads submission via token, pre-populates form, accepts edits, and shows all error states correctly</done>
</task>

## Success Criteria
- [ ] /edit-request page submits successfully and shows correct success/error states
- [ ] /edit/[token] pre-populates form with existing submission values
- [ ] Token validation errors (expired, used, invalid) render appropriate full-page error states
- [ ] Edit submission saves and shows success state
- [ ] No TypeScript errors
