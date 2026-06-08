"use client";

import { useState } from "react";
import { EditRequestRead, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface EditRequestCardProps {
  request: EditRequestRead;
  onUpdated: (updated: EditRequestRead) => void;
}

export function EditRequestCard({ request, onUpdated }: EditRequestCardProps) {
  const { token } = useAuth();
  const [adminNote, setAdminNote] = useState(request.admin_note ?? "");
  const [isActing, setIsActing] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Link");

  const editUrl =
    request.edit_token
      ? (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.host}/edit/${request.edit_token}`
          : `/edit/${request.edit_token}`)
      : null;

  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";

  const accentColor =
    isPending
      ? "border-l-yellow-500"
      : isApproved
      ? "border-l-green-500"
      : "border-l-red-500";

  const handleApprove = async () => {
    if (!token) return;
    setIsActing(true);
    try {
      const updated = await api.approveEditRequest(request.id, adminNote.trim() || null, token);
      toast.success("Edit request approved. Share the link with the submitter.");
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve.");
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    setIsActing(true);
    try {
      const updated = await api.rejectEditRequest(request.id, adminNote.trim() || null, token);
      toast.success("Edit request rejected.");
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject.");
    } finally {
      setIsActing(false);
    }
  };

  const handleCopyLink = () => {
    if (!editUrl) return;
    navigator.clipboard.writeText(editUrl);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy Link"), 2000);
    toast.success("Edit link copied to clipboard!");
  };

  const expiryDate = request.token_expires_at
    ? new Date(request.token_expires_at)
    : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const isNearExpiry =
    expiryDate && !isExpired
      ? expiryDate.getTime() - Date.now() < 3600_000
      : false;

  return (
    <div
      id={`edit-request-card-${request.id}`}
      className={`neo-card p-0 overflow-hidden border-l-4 ${accentColor}`}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-bold text-sm">{request.form_name ?? "Unknown Form"}</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Submission:{" "}
              <span className="font-bold text-foreground">
                {request.human_submission_id ?? request.submission_id}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Requested{" "}
              {new Date(request.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {request.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Reviewed{" "}
                {new Date(request.reviewed_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="bg-muted/20 border-2 border-border p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Reason
          </p>
          <p className="text-sm font-semibold whitespace-pre-wrap">{request.reason}</p>
        </div>

        {/* Approved: show edit link */}
        {isApproved && editUrl && (
          <div className="space-y-2">
            {isNearExpiry && (
              <div className="bg-yellow-50 border-2 border-yellow-500 p-2 text-xs font-bold text-yellow-800">
                ⚠ This link expires in less than 1 hour!
              </div>
            )}
            {isExpired && (
              <div className="bg-destructive/10 border-2 border-destructive p-2 text-xs font-bold text-destructive">
                ⏰ This link has expired.
              </div>
            )}
            <div className="border-2 border-border p-2 flex items-center gap-2 flex-wrap">
              <code className="font-mono text-xs flex-1 break-all text-accent-2">
                {editUrl}
              </code>
              <Button
                id={`copy-link-btn-${request.id}`}
                onClick={handleCopyLink}
                className="neo-btn bg-surface hover:bg-neutral-100 h-8 px-3 text-xs font-bold shrink-0"
              >
                {copyLabel}
              </Button>
            </div>
            {expiryDate && (
              <p className="text-xs text-muted-foreground font-mono">
                {isExpired ? "Expired" : "Expires"}{" "}
                {expiryDate.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {request.token_used && (
                  <span className="ml-2 text-green-700 font-bold">[USED]</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Rejected: show admin note */}
        {request.status === "rejected" && request.admin_note && (
          <div className="bg-destructive/10 border-2 border-destructive p-3 text-destructive">
            <p className="text-xs font-bold uppercase tracking-wider mb-1">
              Rejection Note
            </p>
            <p className="text-sm font-semibold">{request.admin_note}</p>
          </div>
        )}

        {/* Pending: approve/reject controls */}
        {isPending && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Admin Note (optional)
              </label>
              <textarea
                id={`admin-note-${request.id}`}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add an internal note or message to the submitter..."
                className="neo-input w-full p-2.5 text-sm min-h-[60px] border-2 bg-surface resize-y"
              />
            </div>
            <div className="flex gap-2">
              <Button
                id={`approve-btn-${request.id}`}
                onClick={handleApprove}
                disabled={isActing}
                className="neo-btn bg-green-500 text-white hover:bg-green-600 font-bold text-sm h-9 px-4 flex-1"
              >
                {isActing ? "Processing..." : "✓ Approve"}
              </Button>
              <Button
                id={`reject-btn-${request.id}`}
                onClick={handleReject}
                disabled={isActing}
                className="neo-btn bg-destructive text-white hover:bg-destructive/90 font-bold text-sm h-9 px-4 flex-1"
              >
                {isActing ? "Processing..." : "✗ Reject"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
