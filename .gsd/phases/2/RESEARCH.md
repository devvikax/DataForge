# Phase 2 Research — Form Builder

This document outlines the technical design, architectural patterns, and libraries chosen for the Phase 2 (Form Builder) implementation.

## 1. Drag and Drop Implementation
We evaluated two main approaches for the form field order management:
1. **Third-party Library (`@dnd-kit` or `@hello-pangea/dnd`)**:
   - *Pros*: Smooth drag animations, accessible out-of-the-box.
   - *Cons*: Next.js 14 App Router SSR warnings, package weight, setup complexity.
2. **HTML5 Native Drag-and-Drop + Keyboard Controls (Move Up/Down Buttons)**:
   - *Pros*: Zero external dependencies, lightweight, 100% reliable in Next.js SSR, perfect mobile compatibility (via keyboard/button controls).
   - *Cons*: Custom styling required for drag visual states.

**Decision**: We will use HTML5 Native Drag-and-Drop API for the mouse-based sorting, paired with explicit "Move Up" and "Move Down" buttons on each field card for mobile responsiveness and accessibility.

---

## 2. Conditional Logic Schema
To support showing/hiding fields dynamically when another field equals a specific value, fields will store a `conditions` JSON array.

**JSON Schema**:
```json
[
  {
    "field_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "operator": "equals",
    "value": "Option 1"
  }
]
```

**Evaluation Logic**:
In the form rendering component, we will maintain a key-value store of current form values. A field is visible if:
- It has no conditions, OR
- Every condition in its `conditions` array evaluates to `true` (logical AND).
For the `equals` operator, we check if the current value of `field_id` matches `value`.

---

## 3. Duplicate Detection Design
Forms can be configured with duplicate detection. The `forms` table has a `unique_field_ids` column containing an array of field IDs that must be unique.

**Validation Flow**:
1. When a submission is received, the backend retrieves the form and its `unique_field_ids`.
2. For each unique field ID, the backend queries the `submission_values` table:
   ```sql
   SELECT COUNT(*) FROM submission_values sv
   JOIN submissions s ON sv.submission_id = s.id
   WHERE s.form_id = :form_id 
     AND sv.field_id = :field_id 
     AND sv.value_text = :submitted_value
   ```
3. If the count is > 0, the submission is rejected with an HTTP 409 Conflict status code and a clear error message.

---

## 4. REST API Endpoint Definitions

- `GET /api/forms` — List all forms (returns ID, name, slug, active status, and counts).
- `POST /api/forms` — Create a form.
- `GET /api/forms/{id}` — Get form details (including all fields ordered by `order`).
- `PATCH /api/forms/{id}` — Update form settings (name, description, slug, is_active, unique_field_ids).
- `DELETE /api/forms/{id}` — Delete a form (cascades to fields and submissions).
- `POST /api/forms/{id}/fields` — Add or update form fields.
- `PUT /api/forms/{id}/fields/reorder` — Update ordering of all fields in one call.
