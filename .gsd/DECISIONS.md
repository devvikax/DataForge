# DECISIONS.md — Architecture Decision Records

> DataForge | Started: 2026-06-07

---

## ADR-001: EAV Model for Submission Values

**Date**: 2026-06-07
**Status**: Accepted

**Context**: Forms are dynamic — each form has a different set of fields. Storing submission data in a rigid table would require schema changes per form, which is impractical.

**Decision**: Use an Entity-Attribute-Value model with a `submission_values` table (submission_id, field_id, value_text, value_json). JSON column handles array values (checkboxes, multi-select).

**Consequences**:
- Pro: Fully flexible for any form structure without schema changes
- Pro: Simple to add new field types
- Con: Complex queries for filtering/sorting by specific field values
- Mitigation: Add composite index on (form_id, field_id); use materialized views or cached analytics

---

## ADR-002: Cloudinary for File Storage

**Date**: 2026-06-07
**Status**: Accepted

**Context**: Local file storage is not viable for a platform meant to handle resumes, certificates, and images. Firebase Storage adds Google dependency. S3 requires AWS account setup.

**Decision**: Use Cloudinary for all file uploads. Files are uploaded via the backend using the Cloudinary Python SDK. Only the resulting URL and metadata are stored in PostgreSQL.

**Consequences**:
- Pro: CDN delivery, automatic transformations, no infrastructure to manage
- Pro: Free tier is sufficient for personal use
- Con: Internet required for uploads (no offline fallback)
- Con: Cloudinary account credentials required in env

---

## ADR-003: Pre-Upload File Pattern

**Date**: 2026-06-07
**Status**: Accepted

**Context**: If files are uploaded as part of form submission, a failed submission could leave orphaned files on Cloudinary.

**Decision**: Files are uploaded to Cloudinary BEFORE the submission is sent. The frontend receives the Cloudinary URL and includes it in the submission payload. If submission fails, the uploaded file may be orphaned (acceptable in v1; cleanup job is a v2 feature).

**Consequences**:
- Pro: Submission payload is clean and atomic
- Con: Orphaned files possible on submission failure (acceptable risk for v1)

---

## ADR-004: Per-Form Submission ID Sequence

**Date**: 2026-06-07
**Status**: Accepted

**Context**: Submission IDs need to be unique, human-readable, and meaningful. A global sequence would mix IDs across forms, making per-form reporting confusing.

**Decision**: Submission IDs are per-form per-year: `DF-{YEAR}-{6-digit-zero-padded-sequence-within-form}`. The sequence counter is stored in the `forms` table and incremented atomically using a database-level lock.

**Consequences**:
- Pro: Each form has its own readable submission numbering (e.g., Form A: DF-2026-000001 to DF-2026-000500)
- Con: Slightly more complex sequence generation logic
- Mitigation: Use `SELECT ... FOR UPDATE` or PostgreSQL sequence per form

---

## ADR-005: Conditional Logic JSON Schema

**Date**: 2026-06-07
**Status**: Accepted

**Context**: Conditional logic needs to be stored in the database and evaluated on both backend (for validation) and frontend (for real-time show/hide).

**Decision**: Store conditions as a JSON array on each `form_field` record:
```json
{
  "show_if": [
    { "field_id": "uuid", "operator": "equals", "value": "Yes" }
  ]
}
```
Operators in v1: `equals`, `not_equals`, `contains`. All conditions in a group are AND-combined.

**Consequences**:
- Pro: Simple, extensible, evaluable in both Python and TypeScript
- Con: Complex logic (OR, nested) not supported in v1
- Mitigation: Document as known limitation; OR logic is a v2 enhancement

---

## ADR-006: Single Admin Account via Environment Variables

**Date**: 2026-06-07
**Status**: Accepted

**Context**: v1 targets a single administrator. Building a full user registration/invite system adds complexity without benefit at this stage.

**Decision**: Admin username and hashed password are seeded via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`). A CLI seed command creates the user record on first run. No registration endpoint is exposed.

**Consequences**:
- Pro: Zero attack surface for unauthorized account creation
- Con: Changing password requires env var update + container restart
- Mitigation: Document the password change process; ADMIN_PASSWORD_HASH is bcrypt hash

---

## ADR-007: Next.js App Router

**Date**: 2026-06-07
**Status**: Accepted

**Context**: Next.js 14 with App Router is the current standard for new Next.js projects.

**Decision**: Use App Router with React Server Components for static/public pages and Client Components for interactive admin dashboard sections.

**Consequences**:
- Pro: Better performance through RSC + streaming
- Pro: Built-in route groups for clean admin/public separation
- Con: Steeper learning curve than Pages Router
