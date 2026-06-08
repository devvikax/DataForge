# Phase 6 Research: Functionality Audit Strategy

## Discovery Level
**Level 0: Skip / Pure Internal Codebase Patterns**
The objective of this phase is to audit the current codebase, find any hidden mock logic or UI placeholders, and fix them to achieve a production-ready MVP. We are not introducing new frameworks or external integrations, so no new libraries are needed.

## Audit Strategy
To perform a complete functionality audit of DataForge without assuming any feature is finished, we will use two methods:
1. **Static Analysis & Code Search**:
   - Inspect backend schemas, routes, and services for mock fallbacks or empty logic.
   - Inspect frontend components and pages for static arrays, incomplete handlers, disabled button states without backing features, and commented-out integrations.
2. **Dynamic Flow Inspection**:
   - Verify dynamic field persistence: Check that form creation actually saves properties like `options`, `conditions`, and constraints to PostgreSQL, and that public forms render them.
   - Verify submission processing: Assert that responses are correctly stored in EAV tables, Submission IDs increment correctly, and duplicate checks block double submissions.
   - Verify edit request lifecycle: Confirm that UUID generation, 24h expiration, and token usage function correctly.
   - Verify analytics and exports: Ensure charts use database-backed statistics, exports compile real submissions data, and printable reports layout correctly.

## Deliverable
The direct output of the audit task will be a comprehensive report: `.gsd/phases/6/AUDIT.md`.
It will categorize items into:
1. Fully Working Features
2. Partially Implemented Features
3. UI-Only Placeholder Features
4. Broken Features
5. Missing Features Required for a Production-Ready MVP
