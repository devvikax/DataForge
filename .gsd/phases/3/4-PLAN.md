---
phase: 3
plan: 4
wave: 4
depends_on: [3.3]
---

# Plan 3.4: Review Screen, File Upload Dragzone, & Success Page

## Objective
Implement public-facing file upload dropzone supporting drag-and-drop, client-side constraint checks, and progress bars. Build the form Review step (values summary with confirmation checkbox) and the final Success step displaying the generated Submission ID.

## Context
- .gsd/SPEC.md
- frontend/app/f/[slug]/page.tsx
- frontend/lib/api.ts

## Tasks

<task type="auto">
  <name>Build drag-and-drop File Upload component with upload state</name>
  <files>
    /frontend/components/public/file-dropzone.tsx
    /frontend/app/f/[slug]/page.tsx
  </files>
  <action>
    Create `frontend/components/public/file-dropzone.tsx`:
    - Renders a styled Neo-Brutalist dropzone with drag events (`onDragOver`, `onDragLeave`, `onDrop`).
    - Validates file constraints client-side before sending: MIME type, file size, and maximum file count.
    - Shows progress bars representing real-time upload progress (can simulate or use httpx/fetch XML progress events).
    - Calls backend `POST /api/uploads/` to execute upload.
    - Returns Cloudinary metadata to parent form state.
    
    Integrate `FileDropzone` in public form page.
  </action>
  <verify>
    Verify compilation of the file-dropzone component.
  </verify>
  <done>
    - Styled dropzone handles file drop, type validations, and size boundaries
    - Real-time upload feedback or simulated progress indicator is displayed
    - Backend upload resolves and updates form values with Cloudinary endpoints
  </done>
</task>

<task type="auto">
  <name>Build Review screen and Success page workflows</name>
  <files>
    /frontend/app/f/[slug]/page.tsx
  </files>
  <action>
    Implement Review step in `page.tsx` (`step == "review"`):
    - Renders a read-only checklist summarizing all entered field labels and values.
    - Adds a mandatory confirmation checkbox ("I verify all details entered are correct").
    - "Submit Form" button executes `POST /api/submissions/{form_id}`.
    - Handles conflict responses (HTTP 409) displaying clear validation alerts for unique fields.
    
    Implement Success step in `page.tsx` (`step == "success"`):
    - Displays a large Neo-Brutalist card highlighting the generated Submission ID (e.g. `DF-2026-000001`).
    - Provides a "Copy ID" action button.
    - Renders success messages encouraging the user to save their Submission ID.
  </action>
  <verify>
    Run full application build compilation using `npm run build`.
  </verify>
  <done>
    - Review step presents summary and enforces confirmation check
    - Submission endpoint call resolves generated Submission ID
    - Success step renders Submission ID card with copy actions
    - Full project compilation passes successfully
  </done>
</task>

## Success Criteria
- [ ] Drag-and-drop file upload checks file limits and updates upload status
- [ ] Review step requires checkbox verification before form submit
- [ ] Form submit results in a success page displaying the sequential Submission ID
