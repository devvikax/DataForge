---
phase: 6
plan: 2
wave: 1
---

# Plan 6.2: Implement MVP Functional Gap Fixes

## Objective
Systematically implement fixes for all partially built, placeholder, or broken features identified in the audit report to achieve a fully database-driven, functional MVP.

## Context
- .gsd/SPEC.md
- .gsd/phases/6/AUDIT.md
- .gsd/phases/6/1-PLAN.md

## Tasks

<task type="auto">
  <name>Implement Backend & Frontend Gap Fixes</name>
  <files>
    - backend/app/routers/forms.py
    - backend/app/routers/submissions.py
    - frontend/app/(admin)/admin/forms/page.tsx
    - frontend/app/(admin)/admin/forms/[id]/submissions/page.tsx
    - frontend/app/(admin)/admin/analytics/[id]/page.tsx
  </files>
  <action>
    Modify components and endpoints to address any discovered issues:
    - Replace all mock data arrays with direct API fetches from the database.
    - Wire up any non-functional buttons or placeholders in the admin dashboard (e.g., status triggers, settings switches, exports).
    - Ensure dynamic field configurations correctly save and render all options, conditional structures, and constraint settings.
    - Verify database-backed status transitions and cache rebuilding occur flawlessly.
  </action>
  <verify>
    Verify with dynamic page loading, backend log audits, and manual verification tests.
  </verify>
  <done>
    No placeholder dashboards remain; all features interact with live SQLAlchemy models/endpoints.
  </done>
</task>

## Success Criteria
- [ ] UI placeholders and hardcoded mock stats are fully removed.
- [ ] All forms builder and submissions manager actions are bound to backend services.
- [ ] Client console errors and broken API warnings are resolved.
