---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Cloudinary Setup & Backend File Upload API

## Objective
Configure the Cloudinary Python SDK on the backend and implement a public file upload endpoint `POST /api/uploads`. The endpoint will validate file types and sizes against form field configurations and support a mock fallback when Cloudinary env keys are unconfigured.

## Context
- .gsd/SPEC.md
- backend/app/core/config.py
- backend/requirements.txt

## Tasks

<task type="auto">
  <name>Configure Cloudinary SDK and create file upload router</name>
  <files>
    /backend/app/core/config.py
    /backend/app/routers/uploads.py
    /backend/app/main.py
  </files>
  <action>
    Configure and export Cloudinary SDK configuration in backend.
    
    Create `backend/app/routers/uploads.py`:
    - Add public endpoint `POST /api/uploads` accepting `file: UploadFile` and `form_field_id: uuid.UUID` as form parameters.
    - Fetch form field configuration by `form_field_id` to validate MIME type and size limits:
      - If `field.field_type != "file"`, raise 400.
      - If file MIME type is not in `field.file_accepted_types` (when configured), raise 400.
      - If file size exceeds `field.file_max_size_mb` (when configured), raise 400.
    - If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in settings are all populated:
      - Perform upload using `cloudinary.uploader.upload(file.file, folder="dataforge", resource_type="auto")`.
      - Retrieve `public_id`, `url`, and `secure_url`.
    - Else (Mock Fallback):
      - Log warning that Cloudinary keys are unconfigured.
      - Generate a mock public ID and local URL: `http://localhost:8000/mock-uploads/{filename}`.
    - Return JSON response containing:
      - `cloudinary_public_id`
      - `cloudinary_url`
      - `cloudinary_secure_url`
      - `original_filename`
      - `file_type` (MIME type)
      - `file_size_bytes`
      
    Include the new uploads router in `backend/app/main.py` under prefix `/api/uploads`.
  </action>
  <verify>
    Verify uvicorn compiles and routes successfully.
  </verify>
  <done>
    - Uploads router registered in FastAPI application
    - Correctly handles validation of MIME types and size constraints
    - Gracefully falls back to mock metadata if Cloudinary keys are empty
  </done>
</task>

<task type="auto">
  <name>Implement uploads API integration tests</name>
  <files>
    /backend/app/tests/test_uploads.py
  </files>
  <action>
    Create a test script or pytest unit test `backend/app/tests/test_uploads.py` that mocks database access or seeds a form field of type 'file', then performs requests to `POST /api/uploads` verifying:
    - Successful mock file uploads under limits.
    - Rejections for disallowed MIME types.
    - Rejections for oversized files.
  </action>
  <verify>
    Run the tests using pytest: `pytest backend/app/tests/test_uploads.py` or a custom scratch script.
  </verify>
  <done>
    - Automated verification tests validate all size and type constraint checks
  </done>
</task>

## Success Criteria
- [ ] API endpoint `POST /api/uploads` is public and validates files
- [ ] Uploads respect form field constraints defined on the database
- [ ] Mock uploads function successfully without Cloudinary API credentials configured
