---
phase: 2
plan: 2
wave: 2
depends_on: [2.1]
---

# Plan 2.2: Frontend Admin Form List & Form Settings Dashboard

## Objective
Build the admin forms management view: a spreadsheet-style/Neo-Brutalist table listing all created forms, their slugs, active status, and creation dates. Implement form creation and settings modals. After this plan, the admin can view all forms, create new forms, toggle their active status, and modify details.

## Context
- .gsd/SPEC.md
- frontend/lib/api.ts
- frontend/components/ui/neo-card.tsx
- frontend/components/admin/sidebar.tsx

## Tasks

<task type="auto">
  <name>Extend frontend API client for Form and Field requests</name>
  <files>
    /frontend/lib/api.ts
  </files>
  <action>
    Add form CRUD methods to the `api` object in `frontend/lib/api.ts`:
    - `getForms(token: string)` -> `GET /api/forms`
    - `getForm(id: string, token?: string)` -> `GET /api/forms/{id}`
    - `createForm(body: { name: string; slug: string; description?: string }, token: string)` -> `POST /api/forms`
    - `updateForm(id: string, body: Partial<{ name: string; slug: string; description: string; is_active: boolean; unique_field_ids: string[] }>, token: string)` -> `PATCH /api/forms/{id}`
    - `deleteForm(id: string, token: string)` -> `DELETE /api/forms/{id}`
    - `saveFields(formId: string, fields: any[], token: string)` -> `POST /api/forms/{formId}/fields`
    - `reorderFields(formId: string, fieldIds: string[], token: string)` -> `PUT /api/forms/{formId}/fields/reorder`
  </action>
  <verify>
    Next.js compiler verification: `npm run build`
    Expected: Successful build, no TypeScript errors.
  </verify>
  <done>
    - api.ts updated with form and field API helper methods
  </done>
</task>

<task type="auto">
  <name>Build Admin Forms management list page and Settings modals</name>
  <files>
    /frontend/app/(admin)/admin/forms/page.tsx
    /frontend/components/admin/form-settings-modal.tsx
  </files>
  <action>
    Create `frontend/components/admin/form-settings-modal.tsx`:
    - Renders a modal/dialog (using ShadCN Dialog) to create a new form or edit settings (name, description, slug, active status).
    - Auto-generates slug from name (kebab-case, e.g. "My First Form" -> "my-first-form") while allowing manual edits.
    - Validates inputs (e.g., non-empty name, valid slug characters).

    Create `frontend/app/(admin)/admin/forms/page.tsx`:
    - Displays a page header using `AdminTopbar` with a "Create Form" button.
    - Fetches and displays all forms in a Neo-Brutalist table.
    - Table columns: Form Name (clickable to open builder), Public URL Link (copyable), Active Status Badge (Pending/Active), Created At, and Actions dropdown (Edit Settings, Delete).
    - Renders active status toggle directly or via the action menu.
  </action>
  <verify>
    Check page exists: `Test-Path "frontend/app/(admin)/admin/forms/page.tsx"`
    Expected: True
  </verify>
  <done>
    - Forms list page implemented and styled in Neo-Brutalist design
    - Form settings dialog supports both creation and updating of forms
    - Direct slug preview and helper functions integrated
  </done>
</task>

## Success Criteria
- [ ] forms list displays correctly under `/admin/forms`
- [ ] Dialog successfully opens and submits form creation/update requests
- [ ] No compilation warnings or typescript issues
