"use client";

import { useState } from "react";
import { SubmissionRead, FormFieldRead, FileUploadRead, api } from "@/lib/api";
import { StatusBadge, ALL_STATUSES } from "./status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface SubmissionDetailDrawerProps {
  submission: SubmissionRead | null;
  fields: FormFieldRead[];
  onClose: () => void;
  onUpdated: (updated: SubmissionRead) => void;
}

export function SubmissionDetailDrawer({
  submission,
  fields,
  onClose,
  onUpdated,
}: SubmissionDetailDrawerProps) {
  const { token } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset local state when submission changes
  if (submission && selectedStatus === "" && submission.status) {
    setSelectedStatus(submission.status);
    setAdminNotes(submission.admin_notes ?? "");
  }

  if (!submission) return null;

  const handleSaveStatus = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const updated = await api.updateSubmissionStatus(
        submission.id,
        selectedStatus,
        adminNotes.trim() || null,
        token
      );
      onUpdated(updated);
      toast.success("Submission status updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldLabel = (fieldId: string) => {
    return fields.find((f) => f.id === fieldId)?.label ?? fieldId;
  };

  const getFieldValue = (fieldId: string): string => {
    const val = submission.values.find((v) => v.field_id === fieldId);
    if (!val) return "—";
    if (val.value_json !== null && val.value_json !== undefined) {
      if (Array.isArray(val.value_json)) return val.value_json.join(", ") || "—";
      return JSON.stringify(val.value_json);
    }
    return val.value_text ?? "—";
  };

  const getFilesForField = (fieldId: string): FileUploadRead[] => {
    return submission.file_uploads.filter((f) => f.field_id === fieldId);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        id="submission-detail-drawer"
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l-2 border-border z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Submission Details"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b-2 border-border bg-surface">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Submission ID
            </p>
            <h2 className="font-mono font-black text-2xl tracking-tight">
              {submission.submission_id}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted{" "}
              {new Date(submission.submitted_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <button
            id="drawer-close-btn"
            onClick={onClose}
            className="neo-btn bg-surface hover:bg-neutral-100 w-9 h-9 flex items-center justify-center text-lg font-bold mt-0.5"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status management */}
          <div className="neo-card p-4 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider">
              Status Management
            </h3>
            <div className="flex items-center gap-3">
              <select
                id="drawer-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="neo-input h-9 px-2 text-sm bg-surface flex-1"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <StatusBadge status={selectedStatus} />
            </div>
            <div>
              <label className="block font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                Admin Notes (optional)
              </label>
              <textarea
                id="drawer-admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this submission..."
                className="neo-input w-full p-2.5 text-sm min-h-[80px] border-2 bg-surface resize-y"
              />
            </div>
            <Button
              id="drawer-save-status-btn"
              onClick={handleSaveStatus}
              disabled={isSaving}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-9 px-4 w-full"
            >
              {isSaving ? "Saving..." : "Save Status"}
            </Button>
          </div>

          {/* Field values */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider">
              Submitted Values
            </h3>
            {fields.map((field) => {
              const fileUploads = field.field_type === "file" ? getFilesForField(field.id) : [];
              const textValue = field.field_type !== "file" ? getFieldValue(field.id) : null;

              return (
                <div
                  key={field.id}
                  className="neo-card p-3 shadow-none space-y-1"
                >
                  <p className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </p>
                  {field.field_type === "file" ? (
                    fileUploads.length > 0 ? (
                      <ul className="space-y-1">
                        {fileUploads.map((f) => (
                          <li key={f.id}>
                            <a
                              href={f.cloudinary_secure_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-2 underline text-sm font-semibold hover:opacity-80"
                            >
                              📎 {f.original_filename}
                            </a>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({Math.round(f.file_size_bytes / 1024)} KB)
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No files uploaded</p>
                    )
                  ) : (
                    <p className="text-sm font-semibold whitespace-pre-wrap break-words">
                      {textValue || "—"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
