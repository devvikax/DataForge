---
phase: 2
plan: 3
wave: 3
depends_on: [2.2]
---

# Plan 2.3: Frontend Admin Form Builder Canvas & Palette

## Objective
Implement the Core Form Builder layout, Palette, and Canvas. Admin can select fields from a palette (10 types), add them to the form canvas, and reorder them using HTML5 native drag-and-drop or move buttons. Changes are persisted to the backend.

## Context
- .gsd/SPEC.md
- frontend/app/(admin)/admin/forms/page.tsx
- frontend/components/ui/neo-card.tsx

## Tasks

<task type="auto">
  <name>Build Form Builder layout page, Field Palette and Canvas shell</name>
  <files>
    /frontend/app/(admin)/admin/forms/[id]/page.tsx
    /frontend/components/admin/builder/field-palette.tsx
    /frontend/components/admin/builder/builder-canvas.tsx
  </files>
  <action>
    Create `frontend/app/(admin)/admin/forms/[id]/page.tsx`:
    - Form builder main layout wrapper (grid layout).
    - Left Column: Field Palette component.
    - Center Column: Builder Canvas component.
    - Right Column: Property Panel placeholder.
    - Top bar: Shows form name, "Save Form" action button, and "Preview Form" link.
    - Loads form details by ID and manages local builder state (array of fields).

    Create `frontend/components/admin/builder/field-palette.tsx`:
    - Renders a list of the 10 available field types with clear icons and labels.
    - Clicking a field type appends a new field to the canvas.
    - Field types: Text, Textarea, Number, Email, Phone, Date, Dropdown, Radio, Checkbox, File.

    Create `frontend/components/admin/builder/builder-canvas.tsx`:
    - Renders the list of added fields in the form.
    - Displays field type, label, and control buttons (reorder, edit, delete).
    - If empty, displays an illustration or instructions ("Select a field type on the left to get started").
  </action>
  <verify>
    Check pages compile: `npm run build`
    Expected: Successful build.
  </verify>
  <done>
    - Form builder page wrapper loads form from ID
    - Palette renders 10 buttons that append new fields to canvas state
    - Canvas displays list of fields with placeholders
  </done>
</task>

<task type="auto">
  <name>Implement field reordering and persistence logic</name>
  <files>
    /frontend/components/admin/builder/builder-canvas.tsx
    /frontend/components/admin/builder/canvas-field-card.tsx
  </files>
  <action>
    Create `frontend/components/admin/builder/canvas-field-card.tsx`:
    - Represents an individual field in the builder canvas list.
    - Implements HTML5 native drag-and-drop attributes (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
    - Implements sorting actions: "Move Up" (disabled if first), "Move Down" (disabled if last), and "Delete" (removes field).
    - Visual indicators for drag states.

    Integrate reordering and sync handlers:
    - Implement list shifting functions (`moveFieldUp`, `moveFieldDown`) updating index orders.
    - Add "Save" trigger in builder topbar that syncs canvas state to the `/api/forms/{id}/fields` batch endpoint.
  </action>
  <verify>
    Verify files exist and compile successfully.
  </verify>
  <done>
    - Native drag-and-drop reordering works inside form canvas
    - Keyboard/button reordering triggers order shifts
    - Save button successfully pushes updated fields to backend
  </done>
</task>

## Success Criteria
- [ ] Navigating to `/admin/forms/{id}` shows the form builder view
- [ ] Admin can add fields, reorder them, and delete them locally
- [ ] Saving form synchronizes all fields (order, types, labels) to database
