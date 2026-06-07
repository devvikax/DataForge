---
phase: 3
plan: 2
wave: 2
depends_on: [3.1]
---

# Plan 3.2: Backend Submission Creation & Deduplication Engine

## Objective
Implement backend submissions router supporting public unauthenticated `POST /api/submissions/{form_id}` submissions creation. The endpoint will handle unique field constraints (duplicate checks), assign sequence IDs, link uploaded files, and perform bulk EAV insertions.

## Context
- .gsd/SPEC.md
- backend/app/models/submission.py
- backend/app/models/submission_value.py
- backend/app/models/file_upload.py

## Tasks

<task type="auto">
  <name>Create Submissions router and schemas</name>
  <files>
    /backend/app/schemas/submission.py
    /backend/app/routers/submissions.py
    /backend/app/main.py
  </files>
  <action>
    Create `backend/app/schemas/submission.py`:
    - Define `SubmissionValueCreate` schema accepting `field_id: uuid.UUID` and `value: Union[str, List[str], Dict, None]`.
    - Define `FileUploadCreate` schema accepting `field_id: uuid.UUID`, `cloudinary_public_id: str`, `cloudinary_url: str`, `cloudinary_secure_url: str`, `original_filename: str`, `file_type: str`, `file_size_bytes: int`.
    - Define `SubmissionCreate` schema accepting `values: List[SubmissionValueCreate]` and `file_uploads: List[FileUploadCreate]`.
    - Define `SubmissionResponse` schema returning `id`, `submission_id`, `status`, `submitted_at`.
    
    Create `backend/app/routers/submissions.py`:
    - Add public endpoint `POST /api/submissions/{form_id}` accepting `payload: SubmissionCreate`.
    - Validate the form exists and is active (`form.is_active` must be True), else raise 400.
    
    Register the submissions router in `backend/app/main.py` under prefix `/api/submissions`.
  </action>
  <verify>
    Verify uvicorn compiles and loads endpoints.
  </verify>
  <done>
    - Submission schema structures correspond to EAV input mapping
    - Submissions router registered and accessible
  </done>
</task>

<task type="auto">
  <name>Implement Deduplication, Submission ID sequence, and EAV saving transaction</name>
  <files>
    /backend/app/routers/submissions.py
  </files>
  <action>
    Update `POST /api/submissions/{form_id}` route to execute the following transactionally:
    
    1. **Duplicate Check Engine**:
       - Iterate over `form.unique_field_ids` (if configured).
       - For each unique field, search `SubmissionValue` table for any existing record under a different submission for the same form with the identical matching value.
       - If a duplicate match is detected:
         - Raise `HTTP 409 Conflict` with JSON detail: `{"detail": "Duplicate value found for field: [Field Label]"}`.
         
    2. **Submission ID Sequence Generation**:
       - Calculate sequence reset per form per year: count existing submissions for this form in the current calendar year.
       - Set sequence number `seq = count + 1`.
       - Format human-readable ID: `DF-{YEAR}-{seq:06d}`.
       
    3. **Create Records**:
       - Create the `Submission` row.
       - Create `SubmissionValue` records:
         - For list/array values (e.g. checkboxes) or files JSON, store in `value_json`.
         - For other scalar types, store in `value_text`.
       - Create `FileUpload` records matching the payload metadata, linking them to the newly created `submission.id`.
  </action>
  <verify>
    Write a verification test suite in `backend/app/tests/test_submissions.py` testing:
    - Normal submission creation and EAV value verification.
    - Year-based Sequence generation resets.
    - Duplicate detection triggers 409 Conflict.
  </verify>
  <done>
    - Deduplication checks prevent duplicate submissions and return a 409 error
    - Human-readable Submission ID increments per form per year
    - EAV values and file upload metadata are stored in a single transaction
  </done>
</task>

## Success Criteria
- [ ] Submissions successfully save values to `submission_values` (EAV)
- [ ] Sequence ID format `DF-YYYY-NNNNNN` resets correctly per form per year
- [ ] Configuring unique constraints in form settings rejects duplicate submissions with HTTP 409
