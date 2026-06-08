"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, FormDetailRead, FormFieldRead } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NeoCard } from "@/components/ui/neo-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/public/file-dropzone";

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [form, setForm] = useState<FormDetailRead | null>(null);
  const [fields, setFields] = useState<FormFieldRead[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"fill" | "review" | "success">("fill");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const data = await api.getFormPublic(slug);
        setForm(data);
        const sortedFields = [...data.fields].sort((a, b) => a.order - b.order);
        setFields(sortedFields);

        // Initialize default values
        const defaults: Record<string, any> = {};
        sortedFields.forEach((field) => {
          if (field.default_value) {
            defaults[field.id] = field.default_value;
          } else if (field.field_type === "checkbox") {
            defaults[field.id] = [];
          } else if (field.field_type === "file") {
            defaults[field.id] = [];
          } else {
            defaults[field.id] = "";
          }
        });
        setFormValues(defaults);
      } catch (err: any) {
        toast.error(err.detail || "This form is not available or has been closed.");
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [slug]);

  // Dynamic visibility logic
  const shouldShowField = (
    field: FormFieldRead,
    values: Record<string, any>,
    allFields: FormFieldRead[]
  ): boolean => {
    if (!field.conditions || field.conditions.length === 0) return true;

    return field.conditions.every((cond) => {
      const targetField = allFields.find((f) => f.id === cond.field_id);
      if (!targetField) return true;

      const isTargetVisible = shouldShowField(targetField, values, allFields);
      if (!isTargetVisible) return false;

      const currentVal = values[cond.field_id];
      if (currentVal === undefined || currentVal === null || currentVal === "") {
        return false;
      }

      if (Array.isArray(currentVal)) {
        return currentVal.some(
          (v) => String(v).trim().toLowerCase() === String(cond.value).trim().toLowerCase()
        );
      }

      return String(currentVal).trim().toLowerCase() === String(cond.value).trim().toLowerCase();
    });
  };

  // Prune hidden field values dynamically when other values change
  useEffect(() => {
    if (fields.length === 0) return;
    let changed = false;
    const pruned = { ...formValues };

    fields.forEach((field) => {
      const isVisible = shouldShowField(field, pruned, fields);
      if (!isVisible && pruned[field.id] !== undefined) {
        delete pruned[field.id];
        changed = true;
      }
    });

    if (changed) {
      setFormValues(pruned);
    }
  }, [formValues, fields]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const currentValues = formValues[fieldId] ? [...formValues[fieldId]] : [];
    let updatedValues: string[];
    if (checked) {
      updatedValues = [...currentValues, option];
    } else {
      updatedValues = currentValues.filter((v) => v !== option);
    }
    handleInputChange(fieldId, updatedValues);
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      const isVisible = shouldShowField(field, formValues, fields);
      if (isVisible) {
        const value = formValues[field.id];
        if (field.is_required) {
          const isEmptyArray = Array.isArray(value) && value.length === 0;
          const isEmptyString = typeof value === "string" && value.trim() === "";
          const isNil = value === undefined || value === null;

          if (isNil || isEmptyString || isEmptyArray) {
            errors[field.id] = "This field is required";
          }
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please correct the errors in the form before proceeding.");
      // Scroll to first error
      const firstErrorId = Object.keys(errors)[0];
      document.getElementById(`field-container-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth" });
    } else {
      setValidationErrors({});
      setStep("review");
    }
  };

  const handleFormSubmit = async () => {
    if (!form || !isAgreed) return;
    setIsSubmitting(true);

    try {
      // 1. Gather all file uploads metadata
      const fileUploadsList: any[] = [];
      const valuesList: any[] = [];

      fields.forEach((field) => {
        const isVisible = shouldShowField(field, formValues, fields);
        if (isVisible) {
          const rawVal = formValues[field.id];
          
          if (field.field_type === "file" && Array.isArray(rawVal)) {
            // value_json gets URLs, file_uploads holds full metadata
            const urls = rawVal.map((f: any) => f.cloudinary_url);
            valuesList.push({
              field_id: field.id,
              value: urls
            });
            rawVal.forEach((uploadedFile: any) => {
              fileUploadsList.push({
                field_id: field.id,
                cloudinary_public_id: uploadedFile.cloudinary_public_id,
                cloudinary_url: uploadedFile.cloudinary_url,
                cloudinary_secure_url: uploadedFile.cloudinary_secure_url,
                original_filename: uploadedFile.original_filename,
                file_type: uploadedFile.file_type,
                file_size_bytes: uploadedFile.file_size_bytes
              });
            });
          } else {
            valuesList.push({
              field_id: field.id,
              value: rawVal
            });
          }
        }
      });

      const payload = {
        values: valuesList,
        file_uploads: fileUploadsList
      };

      // 2. POST submission
      const response = await api.post<any>(`/api/submissions/${form.id}`, payload);
      setSubmissionId(response.submission_id);
      setStep("success");
      toast.success("Submission successfully sent!");
    } catch (err: any) {
      toast.error(err.detail || "Failed to submit form. Please check duplicates or inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!submissionId) return;
    navigator.clipboard.writeText(submissionId);
    toast.success("Submission ID copied to clipboard!");
  };

  const visibleFields = fields.filter((field) => shouldShowField(field, formValues, fields));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="neo-card text-center max-w-sm w-full">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading Form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="neo-card text-center max-w-md w-full">
          <span className="text-4xl" role="img" aria-label="Closed">🚫</span>
          <h2 className="font-bold text-xl mt-3">Form Unavailable</h2>
          <p className="text-muted-foreground text-sm mt-1">
            This form does not exist or has been closed by the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* STEP 1: FORM FILL */}
        {step === "fill" && (
          <div className="space-y-6">
            <div className="neo-card bg-surface space-y-2">
              <h1 className="font-bold text-3xl leading-tight">{form.name}</h1>
              {form.description && (
                <p className="text-muted-foreground text-sm">{form.description}</p>
              )}
            </div>

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
                        {field.is_required && <span className="text-red-500 font-bold ml-1">*</span>}
                      </Label>
                      {field.description && (
                        <span className="text-xs text-muted-foreground">{field.description}</span>
                      )}
                    </div>

                    {/* RENDER FIELD INPUTS */}
                    {field.field_type === "text" && (
                      <Input
                        type="text"
                        placeholder={field.placeholder || "Enter text..."}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    )}

                    {field.field_type === "textarea" && (
                      <textarea
                        placeholder={field.placeholder || "Enter long text..."}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input w-full p-2.5 text-sm min-h-[90px] border-2 resize-y bg-surface ${
                          hasError ? "border-destructive" : "border-border"
                        }`}
                      />
                    )}

                    {field.field_type === "number" && (
                      <Input
                        type="number"
                        placeholder={field.placeholder || "0"}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    )}

                    {field.field_type === "email" && (
                      <Input
                        type="email"
                        placeholder={field.placeholder || "name@example.com"}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    )}

                    {field.field_type === "phone" && (
                      <Input
                        type="tel"
                        placeholder={field.placeholder || "+1 (555) 000-0000"}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    )}

                    {field.field_type === "date" && (
                      <Input
                        type="date"
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 text-sm ${hasError ? "border-destructive" : ""}`}
                      />
                    )}

                    {field.field_type === "dropdown" && (
                      <select
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`neo-input h-10 w-full px-3 text-sm bg-surface ${
                          hasError ? "border-destructive" : ""
                        }`}
                      >
                        <option value="">-- Select Option --</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
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
                        onChange={(uploadedFiles) => handleInputChange(field.id, uploadedFiles)}
                        hasError={hasError}
                      />
                    )}

                    {hasError && (
                      <p className="text-xs text-destructive font-bold mt-1">
                        {validationErrors[field.id]}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-base h-12 px-6"
                >
                  Review Submission →
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: FORM REVIEW */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="neo-card bg-surface space-y-2">
              <h1 className="font-bold text-3xl">Review Submission</h1>
              <p className="text-muted-foreground text-sm">
                Please confirm that all details entered below are correct before submitting.
              </p>
            </div>

            <div className="space-y-4">
              {visibleFields.map((field) => {
                const val = formValues[field.id];
                let displayVal = "";

                if (field.field_type === "file" && Array.isArray(val)) {
                  displayVal = val.map((f: any) => f.original_filename).join(", ") || "No files uploaded";
                } else if (Array.isArray(val)) {
                  displayVal = val.join(", ");
                } else {
                  displayVal = val || "-";
                }

                return (
                  <div key={field.id} className="neo-card bg-surface p-4 flex flex-col gap-1">
                    <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                      {field.label}
                    </span>
                    <span className="font-semibold text-base whitespace-pre-wrap">{displayVal}</span>
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
                  I verify all details entered above are correct and accurate. I understand that duplicate submissions will be rejected.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("fill")}
                  className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-11 px-5 flex-1"
                  disabled={isSubmitting}
                >
                  ← Edit Form
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={!isAgreed || isSubmitting}
                  className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-11 px-6 flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Form ✓"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUBMISSION SUCCESS */}
        {step === "success" && (
          <div className="space-y-6 animate-shake">
            <div className="neo-card bg-surface text-center py-12 space-y-5">
              <div className="size-16 bg-accent border-2 border-border mx-auto flex items-center justify-center text-3xl">
                🎉
              </div>
              <div className="space-y-1">
                <h1 className="font-bold text-3xl">Submission Received!</h1>
                <p className="text-muted-foreground text-sm">
                  Your form data has been successfully recorded.
                </p>
              </div>

              <div className="neo-card bg-muted/20 border-dashed border-2 py-6 max-w-sm mx-auto space-y-3">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest block">
                  Your Submission ID
                </span>
                <span className="font-mono font-bold text-2xl tracking-tight block">
                  {submissionId}
                </span>
                <Button
                  onClick={handleCopyId}
                  className="neo-btn bg-surface hover:bg-neutral-100 text-xs h-8 px-4"
                >
                  Copy ID
                </Button>
              </div>

              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-4">
                Please copy and save this ID. You will need it to request edits or refer to your submission in the future.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
