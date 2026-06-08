"use client";

import { useState } from "react";
import { FormFieldRead, FormDetailRead } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FormPreviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDetailRead;
  fields: FormFieldRead[];
}

export function FormPreview({
  isOpen,
  onOpenChange,
  form,
  fields,
}: FormPreviewProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Helper to determine if a field should be shown based on conditional logic
  const shouldShowField = (
    field: FormFieldRead,
    values: Record<string, any>,
    allFields: FormFieldRead[]
  ): boolean => {
    if (!field.conditions || field.conditions.length === 0) return true;

    return field.conditions.every((cond) => {
      const targetField = allFields.find((f) => f.id === cond.field_id);
      if (!targetField) return true;

      // Evaluate preceding field's visibility recursively to avoid showing orphans
      const isTargetVisible = shouldShowField(targetField, values, allFields);
      if (!isTargetVisible) return false;

      const currentVal = values[cond.field_id];
      if (currentVal === undefined || currentVal === null || currentVal === "") {
        return false;
      }

      // Check checkbox arrays vs text value matching
      if (Array.isArray(currentVal)) {
        return currentVal.some(
          (v) => String(v).trim().toLowerCase() === String(cond.value).trim().toLowerCase()
        );
      }

      return String(currentVal).trim().toLowerCase() === String(cond.value).trim().toLowerCase();
    });
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    // Clear validation error when user types/inputs
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

  const handleMockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      // Only validate visible fields
      if (shouldShowField(field, formValues, fields)) {
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
      toast.error("Please fill in all required fields.");
    } else {
      setValidationErrors({});
      toast.success("Validation Success! Form values are valid in Preview Mode.");
      console.log("Mock submitted values:", formValues);
    }
  };

  const visibleFields = fields.filter((field) => shouldShowField(field, formValues, fields));

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl p-0 h-full flex flex-col bg-background border-l-2 border-border shadow-[4px_0_0_#000000]">
        <SheetHeader className="p-5 border-b-2 border-border bg-surface">
          <div className="flex items-center gap-2 mb-1">
            <span className="neo-pill bg-accent text-foreground text-[10px] py-0 px-2 font-bold animate-pulse">
              PREVIEW MODE
            </span>
          </div>
          <SheetTitle className="font-bold text-xl">{form.name || "Form Preview"}</SheetTitle>
          {form.description && (
            <SheetDescription className="text-muted-foreground text-xs mt-1">
              {form.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={handleMockSubmit} className="space-y-6" id="preview-form">
            {visibleFields.length === 0 ? (
              <div className="neo-card py-12 text-center bg-muted/10 border-dashed border-2">
                <p className="text-sm text-muted-foreground italic">
                  No fields are currently visible in this form.
                </p>
              </div>
            ) : (
              visibleFields.map((field) => {
                const hasError = !!validationErrors[field.id];
                const value = formValues[field.id] ?? "";

                return (
                  <div key={field.id} className="space-y-2" id={`preview-field-${field.id}`}>
                    <div className="flex items-center gap-1.5">
                      <Label className="font-bold text-sm">
                        {field.label}
                        {field.is_required && (
                          <span className="text-red-500 font-bold ml-1">*</span>
                        )}
                      </Label>
                    </div>

                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}

                    {/* RENDER DYNAMIC FIELD CONTROLS */}
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
                      <div className="space-y-1.5 pt-1">
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
                      <div className="space-y-1.5 pt-1">
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
                      <div className={`neo-card p-4 bg-muted/5 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 ${
                        hasError ? "border-destructive" : "border-border"
                      }`}>
                        <span className="text-2xl" role="img" aria-label="Upload placeholder">📎</span>
                        <div className="text-xs font-bold">Upload files here</div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          {field.file_accepted_types && (
                            <div>Accepted formats: {field.file_accepted_types.join(", ")}</div>
                          )}
                          <div>Max size: {field.file_max_size_mb || 5}MB</div>
                          <div>Max count: {field.file_max_count || 1} file(s)</div>
                        </div>
                        <input
                          type="file"
                          multiple={(field.file_max_count || 1) > 1}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleInputChange(field.id, Array.from(e.target.files));
                            }
                          }}
                          className="hidden"
                          id={`file-input-${field.id}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById(`file-input-${field.id}`)?.click()}
                          className="neo-btn h-8 px-3 text-xs bg-surface mt-1"
                        >
                          Select File
                        </Button>
                      </div>
                    )}

                    {/* ERROR FEEDBACK */}
                    {hasError && (
                      <p className="text-xs text-destructive font-bold mt-1" id={`error-${field.id}`}>
                        {validationErrors[field.id]}
                      </p>
                    )}
                  </div>
                );
              })
            )}

            {visibleFields.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="w-full h-11 bg-accent hover:bg-accent-hover text-foreground font-bold neo-btn text-base"
                >
                  Mock Submit
                </Button>
              </div>
            )}
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
