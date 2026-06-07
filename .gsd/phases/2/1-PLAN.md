---
phase: 2
plan: 1
wave: 1
depends_on: []
---

# Plan 2.1: FastAPI Form & Field CRUD and Reordering Endpoints

## Objective
Implement all backend routers, Pydantic schemas, and database services required for form creation, retrieval, updates, deletion, field management, and field sorting. After this plan, the API supports full CRUD operations on forms and fields, and field order can be updated in bulk.

## Context
- .gsd/SPEC.md
- .gsd/phases/2/RESEARCH.md
- backend/app/models/form.py (to be verified)
- backend/app/models/form_field.py (to be verified)

## Tasks

<task type="auto">
  <name>Create Pydantic schemas for Forms and FormFields</name>
  <files>
    /backend/app/schemas/form.py
    /backend/app/schemas/form_field.py
  </files>
  <action>
    Create `backend/app/schemas/form_field.py`:
    ```python
    import uuid
    from datetime import datetime
    from typing import Any, List, Optional
    from pydantic import BaseModel, Field


    class FormFieldBase(BaseModel):
        field_type: str  # text, textarea, number, email, phone, date, dropdown, radio, checkbox, file
        label: str
        placeholder: Optional[str] = None
        description: Optional[str] = None
        default_value: Optional[str] = None
        is_required: bool = False
        order: int = 0
        options: Optional[List[str]] = None
        conditions: Optional[List[dict]] = None
        file_accepted_types: Optional[List[str]] = None
        file_max_size_mb: Optional[int] = None
        file_max_count: Optional[int] = None


    class FormFieldCreate(FormFieldBase):
        pass


    class FormFieldUpdate(FormFieldBase):
        id: Optional[uuid.UUID] = None  # Needed for bulk updates/upserts


    class FormFieldRead(FormFieldBase):
        id: uuid.UUID
        form_id: uuid.UUID
        created_at: datetime
        updated_at: datetime

        model_config = {"from_attributes": True}
    ```

    Create `backend/app/schemas/form.py`:
    ```python
    import uuid
    from datetime import datetime
    from typing import List, Optional
    from pydantic import BaseModel, Field
    from app.schemas.form_field import FormFieldRead, FormFieldUpdate


    class FormBase(BaseModel):
        name: str
        slug: str
        description: Optional[str] = None
        is_active: bool = True
        unique_field_ids: List[str] = []


    class FormCreate(FormBase):
        pass


    class FormUpdate(BaseModel):
        name: Optional[str] = None
        slug: Optional[str] = None
        description: Optional[str] = None
        is_active: Optional[bool] = None
        unique_field_ids: Optional[List[str]] = None


    class FormRead(FormBase):
        id: uuid.UUID
        submission_counter: int
        created_at: datetime
        updated_at: datetime

        model_config = {"from_attributes": True}


    class FormDetailRead(FormRead):
        fields: List[FormFieldRead] = []

        model_config = {"from_attributes": True}


    class FieldReorderRequest(BaseModel):
        field_ids: List[uuid.UUID]
    ```
  </action>
  <verify>
    PowerShell: `Test-Path "backend/app/schemas/form.py" -and (Test-Path "backend/app/schemas/form_field.py")`
    Expected: True
  </verify>
  <done>
    - Pydantic schemas exist for Form and FormField creation, updates, and reads
    - FormDetailRead contains list of FormFieldRead schemas
    - FieldReorderRequest schema created
  </done>
</task>

<task type="auto">
  <name>Implement Forms and Fields API router and endpoints</name>
  <files>
    /backend/app/routers/forms.py
    /backend/app/main.py
  </files>
  <action>
    Create `backend/app/routers/forms.py` with CRUD endpoints for forms and fields:
    - `POST /` — Create a form (checks for slug uniqueness)
    - `GET /` — List all forms (ordered by created_at desc)
    - `GET /{id}` — Get form detail (including fields ordered by `order`)
    - `PATCH /{id}` — Update form settings
    - `DELETE /{id}` — Delete form
    - `POST /{id}/fields` — Batch save/update fields for a form (wipes out existing field relations or performs an upsert: batch save is easier, but upsert preserves IDs for submissions. Let's write an upsert/sync function that adds new fields, updates existing fields by ID, and deletes fields that are no longer in the list)
    - `PUT /{id}/fields/reorder` — Reorder fields bulk updates

    Sync Fields Logic (within `POST /{id}/fields`):
    Iterate over the incoming list of FormFieldUpdate objects:
    - If no `id` or `id` not in database: create a new FormField.
    - If `id` in database: update properties.
    - Any existing database FormField for this form that is NOT in the incoming list should be deleted.

    Update `backend/app/main.py` to register the `forms` router at prefix `/api/forms` with tag `forms`.
  </action>
  <verify>
    PowerShell syntax check: `venv\Scripts\python -m py_compile backend/app/routers/forms.py`
    Expected output: (empty, meaning success)
  </verify>
  <done>
    - forms.py router created and imported in app/main.py
    - Forms CRUD routes verified syntactically
    - Batch sync fields endpoint implemented
    - Reorder fields endpoint implemented
  </done>
</task>

## Success Criteria
- [ ] Pydantic schemas successfully defined for all form/field actions
- [ ] `/api/forms` router registered in main FastAPI application
- [ ] No Python syntax or import errors during compilation
