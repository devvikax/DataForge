"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EditRequestPage() {
  const [submissionId, setSubmissionId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!submissionId.trim()) {
      setErrorMsg("Please enter your Submission ID.");
      return;
    }
    if (reason.trim().length < 10) {
      setErrorMsg("Please provide a reason of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createEditRequest(submissionId.trim(), reason.trim());
      setSuccessId(submissionId.trim());
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setErrorMsg("Submission ID not found. Please check and try again.");
        } else if (err.status === 400) {
          setErrorMsg(
            err.detail ||
              "You already have a pending edit request for this submission."
          );
        } else {
          setErrorMsg(err.detail || "Something went wrong. Please try again.");
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 flex justify-center">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand header */}
        <div className="text-center">
          <div className="inline-block neo-border bg-accent px-3 py-1 mb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              DataForge
            </span>
          </div>
          <h1 className="font-black text-3xl tracking-tight">
            Request a Submission Edit
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Enter your Submission ID and explain why you need to edit your
            submission. The administrator will review your request.
          </p>
        </div>

        {!successId ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="neo-card bg-surface space-y-5">
              {/* Submission ID */}
              <div className="space-y-2">
                <label
                  htmlFor="submission-id-input"
                  className="block font-bold text-sm"
                >
                  Submission ID <span className="text-red-500">*</span>
                </label>
                <Input
                  id="submission-id-input"
                  type="text"
                  placeholder="e.g. DF-2026-000001"
                  value={submissionId}
                  onChange={(e) => {
                    setSubmissionId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className={`neo-input h-11 text-sm font-mono ${
                    errorMsg && !reason ? "border-red-500" : ""
                  }`}
                  required
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <label
                  htmlFor="reason-input"
                  className="block font-bold text-sm"
                >
                  Reason for Edit <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason-input"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Please explain why you need to edit your submission (min. 10 characters)..."
                  className="neo-input w-full p-3 text-sm min-h-[120px] border-2 bg-surface resize-y"
                  required
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.length} characters
                </p>
              </div>

              {/* Error */}
              {errorMsg && (
                <div
                  id="edit-request-error"
                  className="bg-destructive/10 border-2 border-destructive p-3 text-sm font-bold text-destructive"
                  role="alert"
                >
                  ⚠ {errorMsg}
                </div>
              )}

              <Button
                id="submit-edit-request-btn"
                type="submit"
                disabled={isSubmitting}
                className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-base h-12 px-6 w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Edit Request"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Your request will be reviewed by the administrator. If approved,
              you will receive a secure edit link.
            </p>
          </form>
        ) : (
          /* Success state */
          <div
            id="edit-request-success"
            className="neo-card bg-surface text-center py-12 space-y-5"
          >
            <div className="size-16 bg-green-400 border-2 border-border mx-auto flex items-center justify-center text-3xl">
              ✓
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-2xl">Request Submitted!</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Your edit request has been received. The administrator will
                review it and share a secure edit link with you if approved.
              </p>
            </div>

            <div className="neo-card bg-muted/20 border-dashed border-2 py-4 max-w-xs mx-auto space-y-2">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest block">
                Your Submission ID
              </span>
              <span className="font-mono font-black text-xl block tracking-tight">
                {successId}
              </span>
            </div>

            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              No further action is needed on your part. The administrator will
              contact you with next steps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
