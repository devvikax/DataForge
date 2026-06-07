# Phase 3 Research — Public Submission Workflow & File Uploads

This document details the architectural approach and choices for implementing Phase 3.

## 1. Next.js Public Form Route & Client-Side Logic

- **Route Structure**: `/f/[slug]/page.tsx` will fetch the form by its unique slug using the public GET `/api/forms/public/{slug}` endpoint.
- **Client-Side State**: We will maintain:
  - `formValues`: `Record<string, any>` mapping `field_id` to values.
  - `errors`: `Record<string, string>` mapping `field_id` to validation messages.
  - `step`: `"fill" | "review" | "success"` to manage the multi-step filling and confirmation workflow.
- **Conditional Visibility**: Visible fields are computed dynamically in real-time. If a field's parent dependency condition becomes false:
  - The child field is hidden.
  - Its value in `formValues` is cleared to prevent submitting hidden data.
- **Required Validations**: Before transitioning to the review screen, client-side validation checks if all currently *visible* required fields have valid non-empty inputs.

## 2. Cloudinary Integration in FastAPI

- **Configuration**: We configure the `cloudinary` SDK inside `backend/app/core/config.py` (or router startup) using `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- **Upload API Route**: `POST /api/submissions/upload` (public endpoint) accepts `file: UploadFile` and `field_id: uuid.UUID` form params.
  - Validates file MIME types against form field configurations (e.g. image/jpeg, application/pdf).
  - Validates size (MB) against field constraints.
  - Uploads the file to Cloudinary.
  - Returns the URL, public ID, name, and size metadata to the client.
  
## 3. Submission ID Generation & EAV Insertion

- **Submission ID Pattern**: `DF-{YEAR}-{6-digit-zero-padded-sequence}`.
  - The sequence is determined dynamically per form per year:
    ```python
    now = datetime.now(timezone.utc)
    year = now.year
    start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)
    
    # Query current count of submissions in this year for the form
    stmt = select(func.count(Submission.id)).where(
        Submission.form_id == form_id,
        Submission.submitted_at >= start_of_year
    )
    res = await db.execute(stmt)
    count = res.scalar() or 0
    seq = count + 1
    submission_id = f"DF-{year}-{seq:06d}"
    ```
- **Transaction Flow**:
  1. Validate the form is active.
  2. Perform duplicate checks on fields specified in `form.unique_field_ids`. If matching value exists in database, raise `HTTP 409 Conflict`.
  3. Generate `submission_id`.
  4. Create `Submission` row.
  5. Bulk insert `SubmissionValue` records:
     - Text/date/dropdown values go to `value_text`.
     - Choice arrays (checkboxes) and File uploaded JSON payloads go to `value_json`.
  6. Bulk insert `FileUpload` metadata rows matching uploaded files.
  7. Commit transaction.
