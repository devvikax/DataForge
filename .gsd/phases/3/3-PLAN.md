---
phase: 3
plan: 3
wave: 3
depends_on: [3.2]
---

# Plan 3.3: Frontend Public Form View & Dynamic Rendering Engine

## Objective
Build the Next.js public form route `/f/[slug]/page.tsx` which renders dynamic inputs based on field schemas, handles inactive forms, and evaluates client-side conditional visibility rules in real-time.

## Context
- .gsd/SPEC.md
- frontend/app/layout.tsx
- frontend/lib/api.ts

## Tasks

<task type="auto">
  <name>Build public form layout, page route and state container</name>
  <files>
    /frontend/app/f/[slug]/page.tsx
  </files>
  <action>
    Create public page `/frontend/app/f/[slug]/page.tsx`:
    - Fetch form by slug using public GET `/api/forms/public/{slug}`.
    - If form is inactive (`is_active == false`), render a professional Neo-Brutalist "Submissions Closed" screen.
    - Maintain state:
      - `formValues`: `Record<string, any>` storing inputs (default values initialized).
      - `errors`: `Record<string, string>` storing validation alerts.
      - `step`: `"fill" | "review" | "success"` (default: `"fill"`).
      - `submissionResult`: object containing final submitted Submission ID.
  </action>
  <verify>
    Verify routing and compilation works.
  </verify>
  <done>
    - Public slug route fetches active form configuration
    - Inactive forms display a closed message banner
  </done>
</task>

<task type="auto">
  <name>Implement dynamic input rendering and conditional logic engine</name>
  <files>
    /frontend/app/f/[slug]/page.tsx
  </files>
  <action>
    Implement dynamic inputs inside `page.tsx` for all 10 field types:
    - Text, Textarea, Number, Email, Phone, Date, Dropdown, Radio, Checkbox, File.
    - Apply consistent Neo-Brutalist inputs styling (`neo-input`, `neo-btn`).
    
    Implement real-time conditional visibility checker:
    - Compute visible fields recursively. A field is visible if all its conditions are met.
    - Rule format: `{ field_id: string, operator: "equals", value: string }`.
    - Check if the target field is visible itself first.
    - If a field is determined to be hidden, remove its entry from `formValues` to avoid submitting stale/hidden data.
    
    Add required fields validation on "Proceed to Review":
    - Verify all visible required fields are populated.
    - If valid, update `step` to `"review"`.
  </action>
  <verify>
    Verify compilation with `npm run build`.
  </verify>
  <done>
    - Inputs for all 10 types display correctly with validation placeholders
    - Real-time conditional logic hides and shows inputs based on user selections
    - Hidden fields have their state values cleaned up automatically
  </done>
</task>

## Success Criteria
- [ ] Inactive forms display "Submissions Closed"
- [ ] Client evaluates conditional logic recursively in real-time
- [ ] Required field validations are checked on currently visible fields
