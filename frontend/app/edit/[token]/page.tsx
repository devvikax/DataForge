"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  ApiError,
  EditRequestFormDetail,
  FormFieldRead,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/public/file-dropzone";
import { toast } from "sonner";

type PageState = "loading" | "fill" | "review" | "success" | "error";
type ErrorKind = "expired" | "used" | "invalid";

export default function SecureEditPage() {
  const params = useParams();
  const editToken = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const [detail, setDetail] = useState<EditRequestFormDetail | null>(null);
  const [fields, setFields] = useState<FormFieldRead[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNearExpiry, setIsNearExpiry] = useState(false);

  // ── Load submission by token ─────────────────────────────────────────────
  useEffect(() => {
    if (!editToken) return;
    api
      .getSubmissionByToken(editToken)
      .then((data) => {
        setDetail(data);
        const sortedFields = [...data.form.fields].sort((a, b) => a.order - b.order);
        setFields(sortedFields);

        // Pre-populate existing values
        const initial: Record<string, any> = {};
        sortedFields.forEach((field) => {
          if (field.field_type === "checkbox") {
            initial[field.id] = [];
          } else if (field.field_type === "file") {
            initial[field.id] = [];
          } else {
            initial[field.id] = "";
          }
        });

        data.values.forEach((val) => {
          if (val.value_json !== null && val.value_json !== undefined) {
            initial[val.field_id] = val.value_json;
          } else if (val.value_text !== null) {
            initial[val.field_id] = val.value_text;
          }
        });

        setFormValues(initial);
        setPageState("fill");
      })
      .catch((err: ApiError) => {
        const msg = err.detail?.toLowerCase() ?? "";
        if (msg.includes("expired")) {
          setErrorKind("expired");
        } else if (msg.includes("already been used") || msg.includes("not approved")) {
          setErrorKind("used");
        } else {
          setErrorKind("invalid");
        }
        setPageState("error");
      });
  }, [editToken]);

  // Check expiry countdown
  useEffect(() => {
    // We don't get expiry from the GET endpoint detail, handled server-side
    // But if we had it, we'd set isNearExpiry here
  }, [detail]);

  // ── Conditional logic ────────────────────────────────────────────────────
  const shouldShowField = (
    field: FormFieldRead,
    values: Record<string, any>,
    allFields: FormFieldRead[]
  ): boolean => {
    if (!field.conditions || field.conditions.length === 0) return true;
    return field.conditions.every((cond) => {
      const target = allFields.find((f) => f.id === cond.field_id);
      if (!target) return true;
      if (!shouldShowField(target, values, allFields)) return false;
      const cur = values[cond.field_id];
      if (cur === undefined || cur === null || cur === "") return false;
      if (Array.isArray(cur)) {
        return cur.some(
          (v) => String(v).trim().toLowerCase() === String(cond.value).trim().toLowerCase()
        );
      }
      return String(cur).trim().toLowerCase() === String(cond.value).trim().toLowerCase();
    });
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const current = formValues[fieldId] ? [...formValues[fieldId]] : [];
    const updated = checked
      ? [...current, option]
      : current.filter((v: string) => v !== option);
    handleInputChange(fieldId, updated);
  };

  const visibleFields = fields.filter((f) => shouldShowField(f, formValues, fields));

  // ── Validation → review ──────────────────────────────────────────────────
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    visibleFields.forEach((field) => {
      if (field.is_required) {
        const value = formValues[field.id];
        const isEmptyArr = Array.isArray(value) && value.length === 0;
        const isEmptyStr = typeof value === "string" && value.trim() === "";
        const isNil = value === undefined || value === null;
        if (isNil || isEmptyStr || isEmptyArr) {
          errors[field.id] = "This field is required";
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please correct the errors before proceeding.");
      const firstId = Object.keys(errors)[0];
      document.getElementById(`field-container-${firstId}`)?.scrollIntoView({ behavior: "smooth" });
    } else {
      setValidationErrors({});
      setPageState("review");
    }
  };

  // ── Submit edit ──────────────────────────────────────────────────────────
  const handleSubmitEdit = async () => {
    if (!isAgreed) return;
    setIsSubmitting(true);

    try {
      const fileUploadsList: any[] = [];
      const valuesList: any[] = [];

      visibleFields.forEach((field) => {
        const raw = formValues[field.id];
        if (field.field_type === "file" && Array.isArray(raw)) {
          const urls = raw.map((f: any) => f.cloudinary_url);
          valuesList.push({ field_id: field.id, value: urls });
          raw.forEach((uf: any) => {
            fileUploadsList.push({
              field_id: field.id,
              cloudinary_public_id: uf.cloudinary_public_id,
              cloudinary_url: uf.cloudinary_url,
              cloudinary_secure_url: uf.cloudinary_secure_url,
              original_filename: uf.original_filename,
              file_type: uf.file_type,
              file_size_bytes: uf.file_size_bytes,
            });
          });
        } else {
          valuesList.push({ field_id: field.id, value: raw });
        }
      });

      await api.applyEditByToken(editToken, {
        values: valuesList,
        file_uploads: fileUploadsList,
      });

      setPageState("success");
      toast.success("Submission updated successfully!");
    } catch (err: any) {
      toast.error(err.detail || "Failed to update submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Error states ─────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="neo-card text-center max-w-sm w-full">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">
            Loading Edit Form...
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    const errorData = {
      expired: {
        icon: "⏰",
        title: "This Edit Link Has Expired",
        desc: "Edit links are valid for 24 hours. Please contact the administrator to request a new one.",
      },
      used: {
        icon: "✓",
        title: "This Edit Link Has Already Been Used",
        desc: "This edit link has already been used to update your submission. If you need to make further changes, please submit a new edit request.",
      },
      invalid: {
        icon: "🚫",
        title: "Invalid Edit Link",
        desc: "This link doesn't exist or has been revoked by the administrator.",
      },
    }[errorKind ?? "invalid"];

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div
          id="edit-error-state"
          className="neo-card text-center max-w-md w-full py-12 space-y-4"
        >
          <div className="size-16 bg-red-100 border-2 border-border mx-auto flex items-center justify-center text-3xl">
            {errorData.icon}
          </div>
          <h2 className="font-bold text-2xl">{errorData.title}</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {errorData.desc}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div
          id="edit-success-state"
          className="neo-card text-center max-w-md w-full py-12 space-y-5"
        >
          <div className="size-16 bg-green-400 border-2 border-border mx-auto flex items-center justify-center text-3xl">
            🎉
          </div>
          <div className="space-y-1">
            <h2 className="font-bold text-2xl">Submission Updated!</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Your submission has been successfully updated. Your Submission ID
              remains unchanged.
            </p>
          </div>
          {detail && (
            <div className="neo-card bg-muted/20 border-dashed border-2 py-4 max-w-xs mx-auto">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest block">
                Submission ID
              </span>
              <span className="font-mono font-black text-xl block tracking-tight mt-1">
                — Confirmed
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main form / review ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="neo-card bg-surface space-y-2">
          <div className="inline-block neo-border bg-accent px-2 py-0.5 mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Secure Edit
            </span>
          </div>
          <h1 className="font-bold text-3xl leading-tight">
            {detail?.form.name ?? "Edit Submission"}
          </h1>
          <p className="text-muted-foreground text-sm">
            You are editing an existing submission. All fields marked with *
            are required.
          </p>
        </div>

        {/* FILL step */}
        {pageState === "fill" && (
          <form onSubmit={handleProceedToReview} className="space-y-6">
            {visibleFields.map((field) => {
              const hasError = !!validationErrors[field.id];
              const value = formValues[field.id] ?? "";

              return (
                <div
                  key={field.id}
                  id={`field-container-${field.id}`}
                  className="neo-card bg-surface space-y-3"
                >
                  <div className="flex flex-col gap-1">
                    <Label className="font-bold text-base">
                      {field.label}
                      {field.is_required && (
                        <span className="text-red-500 font-bold ml-1">*</span>
                      )}
                    </Label>
                    {field.description && (
                      <span className="text-xs text-muted-foreground">
                        {field.description}
                      </span>
                    )}
                  </div>

                  {field.field_type === "text" && (
                    <Input
                      type="text"
                      placeholder={field.placeholder || "Enter text..."}
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 text-sm ${hasError ? "border-red-500" : ""}`}
                    />
                  )}

                  {field.field_type === "textarea" && (
                    <textarea
                      placeholder={field.placeholder || "Enter long text..."}
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input w-full p-2.5 text-sm min-h-[90px] border-2 resize-y bg-surface ${hasError ? "border-red-500" : "border-border"}`}
                    />
                  )}

                  {field.field_type === "number" && (
                    <Input
                      type="number"
                      placeholder={field.placeholder || "0"}
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 text-sm ${hasError ? "border-red-500" : ""}`}
                    />
                  )}

                  {field.field_type === "email" && (
                    <Input
                      type="email"
                      placeholder={field.placeholder || "name@example.com"}
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 text-sm ${hasError ? "border-red-500" : ""}`}
                    />
                  )}

                  {field.field_type === "phone" && (
                    <Input
                      type="tel"
                      placeholder={field.placeholder || "+1 (555) 000-0000"}
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 text-sm ${hasError ? "border-red-500" : ""}`}
                    />
                  )}

                  {field.field_type === "date" && (
                    <Input
                      type="date"
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 text-sm ${hasError ? "border-red-500" : ""}`}
                    />
                  )}

                  {field.field_type === "dropdown" && (
                    <select
                      value={value}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`neo-input h-10 w-full px-3 text-sm bg-surface ${hasError ? "border-red-500" : ""}`}
                    >
                      <option value="">-- Select Option --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.field_type === "radio" && (
                    <div className="space-y-1.5">
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`radio-${field.id}`}
                            value={opt}
                            checked={value === opt}
                            onChange={() => handleInputChange(field.id, opt)}
                            className="size-4 cursor-pointer accent-accent"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.field_type === "checkbox" && (
                    <div className="space-y-1.5">
                      {(field.options || []).map((opt) => {
                        const isChecked = (value || []).includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                handleCheckboxChange(field.id, opt, e.target.checked)
                              }
                              className="size-4 cursor-pointer accent-accent"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {field.field_type === "file" && (
                    <FileDropzone
                      field={field}
                      value={value}
                      onChange={(uploaded) => handleInputChange(field.id, uploaded)}
                      hasError={hasError}
                    />
                  )}

                  {hasError && (
                    <p className="text-xs text-red-600 font-bold mt-1">
                      {validationErrors[field.id]}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-base h-12 px-6"
              >
                Review Changes →
              </Button>
            </div>
          </form>
        )}

        {/* REVIEW step */}
        {pageState === "review" && (
          <div className="space-y-6">
            <div className="neo-card bg-surface space-y-2">
              <h2 className="font-bold text-2xl">Review Your Changes</h2>
              <p className="text-muted-foreground text-sm">
                Please confirm all details below are correct before saving.
              </p>
            </div>

            <div className="space-y-4">
              {visibleFields.map((field) => {
                const val = formValues[field.id];
                let displayVal = "";
                if (field.field_type === "file" && Array.isArray(val)) {
                  displayVal = val.map((f: any) => f.original_filename).join(", ") || "No files";
                } else if (Array.isArray(val)) {
                  displayVal = val.join(", ");
                } else {
                  displayVal = val || "—";
                }
                return (
                  <div key={field.id} className="neo-card bg-surface p-4 flex flex-col gap-1">
                    <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                      {field.label}
                    </span>
                    <span className="font-semibold text-base whitespace-pre-wrap">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="neo-card bg-surface space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="size-5 cursor-pointer accent-accent mt-0.5 shrink-0"
                />
                <span className="text-sm font-bold leading-snug select-none">
                  I confirm these updated details are correct and accurate.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPageState("fill")}
                  disabled={isSubmitting}
                  className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-11 px-5 flex-1"
                >
                  ← Edit Again
                </Button>
                <Button
                  id="confirm-edit-submit-btn"
                  onClick={handleSubmitEdit}
                  disabled={!isAgreed || isSubmitting}
                  className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-11 px-6 flex-1"
                >
                  {isSubmitting ? "Saving..." : "Save Changes ✓"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
