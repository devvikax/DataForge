---
phase: 2
plan: 4
wave: 4
depends_on: [2.3]
---

# Plan 2.4: Form Field Properties, Conditional Logic, and Duplicate Settings

## Objective
Flesh out the Field Property Panel, Conditional Logic editor, Form-level Duplicate settings, and Preview Mode. Admin can edit label, placeholder, options (for dropdown/radio/checkbox), required toggles, file limit settings, conditional rules, unique constraint configurations, and preview the functional form before publishing.

## Context
- .gsd/SPEC.md
- frontend/app/(admin)/admin/forms/[id]/page.tsx
- frontend/components/admin/builder/builder-canvas.tsx

## Tasks

<task type="auto">
  <name>Build Field Property Panel with type-specific properties and options</name>
  <files>
    /frontend/components/admin/builder/property-panel.tsx
  </files>
  <action>
    Create `frontend/components/admin/builder/property-panel.tsx`:
    - Displays properties of the currently selected field in the canvas.
    - Fields: Label, Description, Placeholder, Default Value, Required (toggle).
    - Type-specific inputs:
      - Dropdown, Radio, Checkbox: Options editor (comma-separated or list of strings with Add/Remove option buttons).
      - File: Accepted MIME types checkboxes (images, pdfs, docs), Max size input, Max file count input.
    - Updates local field state in real-time as fields are modified.
  </action>
  <verify>
    Verify compile with `npm run build`.
  </verify>
  <done>
    - Property Panel correctly renders settings for selected field type
    - Options editor allows adding, modifying, and deleting options
    - File upload field limits are editable and saved
  </done>
</task>

<task type="auto">
  <name>Implement Conditional Logic editor and Duplicate Detection configurations</name>
  <files>
    /frontend/components/admin/builder/property-panel.tsx
    /frontend/app/(admin)/admin/forms/[id]/page.tsx
  </files>
  <action>
    Build Conditional Logic config inside `property-panel.tsx`:
    - Renders a conditional rules section for the selected field.
    - Allows adding rules: Select target field (filtered to preceding fields in the form order) + Select operator (equals) + Input expected value.
    - Saves conditions array in the field's `conditions` JSON property.

    Build Duplicate Detection configuration:
    - In the Form Settings view or Builder header, render a "Unique Fields" section.
    - Allows admin to select checkboxes for form fields (e.g. Email, Phone, custom fields) that should form the form's unique constraint key.
    - Updates the form's `unique_field_ids` column.
  </action>
  <verify>
    Check for TypeScript types and validation inside forms/[id]/page.tsx.
  </verify>
  <done>
    - Conditional Logic editor stores conditions in JSON format
    - Target fields in conditional editor are restricted to preceding fields to avoid circular dependencies
    - Form unique fields configuration successfully updates `unique_field_ids`
  </done>
</task>

<task type="auto">
  <name>Build interactive Form Preview Mode inside the builder</name>
  <files>
    /frontend/components/admin/builder/form-preview.tsx
    /frontend/app/(admin)/admin/forms/[id]/page.tsx
  </files>
  <action>
    Create `frontend/components/admin/builder/form-preview.tsx`:
    - Renders a preview sheet/dialog (using ShadCN Sheet) displaying the form exactly as a public submitter will see it.
    - Renders form inputs dynamically based on field types.
    - Implements frontend conditional logic evaluation: dynamically hides/shows fields as input values change.
    - Displays validation errors (e.g., required field warnings) when a mock "Submit" button is clicked.
  </action>
  <verify>
    Check for preview compile.
  </verify>
  <done>
    - Interactive form preview dialog can be launched from topbar
    - Conditional logic shows/hides fields dynamically in preview mode
    - Input rendering matching the design specifications of all 10 field types is verified
  </done>
</task>

## Success Criteria
- [ ] Property panel successfully updates field labels, validation, and options
- [ ] Preceding fields conditional selection prevents circular logic
- [ ] Unique constraints selector correctly maps unique fields
- [ ] Form preview sheet renders correctly and evaluates conditional logic dynamically
