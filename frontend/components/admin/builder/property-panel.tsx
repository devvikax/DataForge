"use client";

import { FormFieldRead, FormDetailRead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PropertyPanelProps {
  selectedField: FormFieldRead | null;
  allFields: FormFieldRead[];
  onUpdateField: (updatedField: FormFieldRead) => void;
  form: FormDetailRead;
  onUpdateForm: (updatedForm: FormDetailRead) => void;
}

const FILE_TYPES_CONFIG = [
  { label: "Images (PNG, JPEG)", value: "image/png,image/jpeg" },
  { label: "PDF Documents", value: "application/pdf" },
  {
    label: "Word/Excel Docs",
    value: "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
];

export function PropertyPanel({
  selectedField,
  allFields,
  onUpdateField,
  form,
  onUpdateForm,
}: PropertyPanelProps) {
  // Preceding fields are those that appear before the current field in order
  const precedingFields = selectedField
    ? allFields.filter((f) => f.order < selectedField.order)
    : [];

  const handleFieldChange = (key: keyof FormFieldRead, value: any) => {
    if (!selectedField) return;
    onUpdateField({
      ...selectedField,
      [key]: value,
      updated_at: new Date().toISOString(),
    });
  };

  const handleFormChange = (key: keyof FormDetailRead, value: any) => {
    onUpdateForm({
      ...form,
      [key]: value,
      updated_at: new Date().toISOString(),
    });
  };

  // Option Editor helpers
  const handleAddOption = () => {
    if (!selectedField) return;
    const currentOptions = selectedField.options ? [...selectedField.options] : [];
    const newOptionNumber = currentOptions.length + 1;
    currentOptions.push(`Option ${newOptionNumber}`);
    handleFieldChange("options", currentOptions);
  };

  const handleUpdateOption = (index: number, val: string) => {
    if (!selectedField || !selectedField.options) return;
    const updatedOptions = [...selectedField.options];
    updatedOptions[index] = val;
    handleFieldChange("options", updatedOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (!selectedField || !selectedField.options) return;
    const updatedOptions = selectedField.options.filter((_, idx) => idx !== index);
    handleFieldChange("options", updatedOptions);
  };

  // Conditional Logic helpers
  const handleAddCondition = () => {
    if (!selectedField) return;
    if (precedingFields.length === 0) {
      toast.warning("You must have preceding fields to add conditional logic.");
      return;
    }
    const currentConditions = selectedField.conditions ? [...selectedField.conditions] : [];
    currentConditions.push({
      field_id: precedingFields[0].id,
      operator: "equals",
      value: "",
    });
    handleFieldChange("conditions", currentConditions);
  };

  const handleUpdateCondition = (index: number, key: string, val: any) => {
    if (!selectedField || !selectedField.conditions) return;
    const updatedConditions = [...selectedField.conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [key]: val,
    };
    handleFieldChange("conditions", updatedConditions);
  };

  const handleRemoveCondition = (index: number) => {
    if (!selectedField || !selectedField.conditions) return;
    const updatedConditions = selectedField.conditions.filter((_, idx) => idx !== index);
    handleFieldChange("conditions", updatedConditions.length > 0 ? updatedConditions : null);
  };

  // Unique constraint checkbox helpers
  const handleToggleUniqueField = (fieldId: string) => {
    const currentUnique = form.unique_field_ids ? [...form.unique_field_ids] : [];
    let updatedUnique: string[];
    if (currentUnique.includes(fieldId)) {
      updatedUnique = currentUnique.filter((id) => id !== fieldId);
    } else {
      updatedUnique = [...currentUnique, fieldId];
    }
    handleFormChange("unique_field_ids", updatedUnique);
  };

  // Render form properties when no field is selected
  if (!selectedField) {
    return (
      <div className="neo-card p-4 h-fit sticky top-6 space-y-5" id="form-settings-panel">
        <div>
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Form Properties</h3>
          <p className="text-xs text-muted-foreground">Modify settings for the overall form.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="form-settings-name" className="font-bold text-sm">Form Name</Label>
            <Input
              id="form-settings-name"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="neo-input h-9 text-sm"
              placeholder="Form Name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-settings-description" className="font-bold text-sm">Description</Label>
            <textarea
              id="form-settings-description"
              value={form.description || ""}
              onChange={(e) => handleFormChange("description", e.target.value)}
              className="neo-input w-full p-2 text-sm min-h-[80px] border-2 border-border resize-y bg-surface"
              placeholder="Brief description for public submitters..."
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <h4 className="font-bold text-sm">Duplicate Detection Settings</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select fields that must together form a unique key. If a submission matches these exact values, it will be flagged as a duplicate.
            </p>
          </div>

          {allFields.length === 0 ? (
            <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 neo-border">
              Add fields to the canvas to configure duplicate detection rules.
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {allFields.map((field) => {
                const isChecked = form.unique_field_ids?.includes(field.id) || false;
                return (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 text-sm font-semibold cursor-pointer p-1.5 hover:bg-muted/10"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleUniqueField(field.id)}
                      className="size-4 cursor-pointer accent-accent"
                    />
                    <span>{field.label || "Untitled Field"}</span>
                    <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1">
                      {field.field_type}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render field properties when a field is selected
  const hasOptions = ["dropdown", "radio", "checkbox"].includes(selectedField.field_type);
  const isFileType = selectedField.field_type === "file";

  return (
    <div className="neo-card p-4 h-fit sticky top-6 space-y-5" id="field-settings-panel">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <span className="neo-pill bg-accent text-foreground text-[9px] font-bold">
            {selectedField.field_type.toUpperCase()}
          </span>
          <h3 className="font-bold text-base mt-1 truncate max-w-[150px]" title={selectedField.label}>
            {selectedField.label || "Field Settings"}
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label htmlFor="field-settings-label" className="font-bold text-sm">Field Label</Label>
          <Input
            id="field-settings-label"
            value={selectedField.label}
            onChange={(e) => handleFieldChange("label", e.target.value)}
            className="neo-input h-9 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="field-settings-desc" className="font-bold text-sm">Description/Help Text</Label>
          <Input
            id="field-settings-desc"
            value={selectedField.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value || null)}
            className="neo-input h-9 text-sm"
            placeholder="Helpful guidance for the submitter..."
          />
        </div>

        {/* Placeholder */}
        {!hasOptions && !isFileType && (
          <div className="space-y-1.5">
            <Label htmlFor="field-settings-placeholder" className="font-bold text-sm">Placeholder</Label>
            <Input
              id="field-settings-placeholder"
              value={selectedField.placeholder || ""}
              onChange={(e) => handleFieldChange("placeholder", e.target.value || null)}
              className="neo-input h-9 text-sm"
              placeholder="e.g. Enter value..."
            />
          </div>
        )}

        {/* Default Value */}
        {!hasOptions && !isFileType && (
          <div className="space-y-1.5">
            <Label htmlFor="field-settings-default" className="font-bold text-sm">Default Value</Label>
            <Input
              id="field-settings-default"
              value={selectedField.default_value || ""}
              onChange={(e) => handleFieldChange("default_value", e.target.value || null)}
              className="neo-input h-9 text-sm"
              placeholder="e.g. Pre-filled value"
            />
          </div>
        )}

        {/* Validation: Required */}
        <label className="flex items-center gap-2 font-bold text-sm cursor-pointer p-1 border-t border-border mt-2 pt-3">
          <input
            type="checkbox"
            checked={selectedField.is_required}
            onChange={(e) => handleFieldChange("is_required", e.target.checked)}
            className="size-4 cursor-pointer accent-accent"
          />
          <span>Is Required Field</span>
        </label>

        {/* Options Editor for Choice Fields */}
        {hasOptions && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm">Configure Options</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="neo-btn h-7 px-2 text-[11px] bg-accent/10 hover:bg-accent/20"
              >
                + Add Option
              </Button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {(selectedField.options || []).map((option, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(idx, e.target.value)}
                    className="neo-input h-8 text-xs flex-1"
                    placeholder={`Option ${idx + 1}`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveOption(idx)}
                    className="neo-btn h-8 w-8 p-0 text-danger hover:bg-red-50"
                    title="Remove Option"
                    disabled={(selectedField.options || []).length <= 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {(selectedField.options || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">No options defined.</p>
              )}
            </div>
          </div>
        )}

        {/* File Upload Constraints */}
        {isFileType && (
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="font-bold text-sm">File Constraints</h4>

            <div className="space-y-2">
              <Label className="font-semibold text-xs">Accepted File Types</Label>
              <div className="space-y-1.5">
                {FILE_TYPES_CONFIG.map((config) => {
                  const currentAccepted = selectedField.file_accepted_types || [];
                  const isChecked = currentAccepted.includes(config.value);
                  const handleToggleType = () => {
                    let updated: string[];
                    if (isChecked) {
                      updated = currentAccepted.filter((v) => v !== config.value);
                    } else {
                      updated = [...currentAccepted, config.value];
                    }
                    handleFieldChange("file_accepted_types", updated.length > 0 ? updated : null);
                  };

                  return (
                    <label key={config.label} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleToggleType}
                        className="size-3.5 cursor-pointer accent-accent"
                      />
                      <span>{config.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="file-max-size" className="font-semibold text-xs">Max Size (MB)</Label>
                <Input
                  id="file-max-size"
                  type="number"
                  min={1}
                  max={50}
                  value={selectedField.file_max_size_mb || 5}
                  onChange={(e) => handleFieldChange("file_max_size_mb", parseInt(e.target.value) || 5)}
                  className="neo-input h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="file-max-count" className="font-semibold text-xs">Max Files</Label>
                <Input
                  id="file-max-count"
                  type="number"
                  min={1}
                  max={10}
                  value={selectedField.file_max_count || 1}
                  onChange={(e) => handleFieldChange("file_max_count", parseInt(e.target.value) || 1)}
                  className="neo-input h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Logic Editor */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm">Conditional Logic</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
              className="neo-btn h-7 px-2 text-[11px] bg-accent/10 hover:bg-accent/20"
              disabled={precedingFields.length === 0}
            >
              + Add Rule
            </Button>
          </div>

          {precedingFields.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 border border-dashed">
              Requires preceding fields to set dependencies.
            </p>
          )}

          {precedingFields.length > 0 && (
            <div className="space-y-3">
              {(selectedField.conditions || []).map((cond, idx) => (
                <div key={idx} className="neo-border p-2 bg-muted/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">Rule {idx + 1}</span>
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveCondition(idx)}
                      className="h-5 px-1.5 text-[10px] text-danger hover:bg-red-50 border-none"
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[10px] text-muted-foreground">Show if Field</label>
                    <select
                      value={cond.field_id}
                      onChange={(e) => handleUpdateCondition(idx, "field_id", e.target.value)}
                      className="neo-input h-7 w-full text-xs px-1 border border-border"
                    >
                      {precedingFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label || "Untitled Field"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[10px] text-muted-foreground">Equals Value</label>
                    <Input
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(idx, "value", e.target.value)}
                      className="neo-input h-7 text-xs"
                      placeholder="Expected value"
                    />
                  </div>
                </div>
              ))}
              {(selectedField.conditions || []).length === 0 && (
                <p className="text-xs text-muted-foreground italic">Always visible.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
