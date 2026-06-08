"use client";

import { Button } from "@/components/ui/button";

const FIELD_TYPES = [
  { type: "text", label: "Text Field", icon: "🔤" },
  { type: "textarea", label: "Long Text", icon: "📝" },
  { type: "number", label: "Number", icon: "🔢" },
  { type: "email", label: "Email Address", icon: "📧" },
  { type: "phone", label: "Phone Number", icon: "📞" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "dropdown", label: "Select Dropdown", icon: "🔽" },
  { type: "radio", label: "Radio Buttons", icon: "🔘" },
  { type: "checkbox", label: "Checkboxes", icon: "☑️" },
  { type: "file", label: "File Upload", icon: "📎" },
] as const;

interface FieldPaletteProps {
  onAddField: (type: typeof FIELD_TYPES[number]["type"]) => void;
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="neo-card p-4 h-fit sticky top-6">
      <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Field Palette</h3>
      <div className="grid grid-cols-2 gap-2" id="field-palette-grid">
        {FIELD_TYPES.map((field) => (
          <Button
            key={field.type}
            id={`add-field-btn-${field.type}`}
            onClick={() => onAddField(field.type)}
            variant="outline"
            className="neo-btn bg-surface hover:bg-accent/20 flex flex-col items-center justify-center p-3 h-20 text-center gap-1.5"
          >
            <span className="text-xl" role="img" aria-hidden="true">{field.icon}</span>
            <span className="text-xs font-bold leading-tight">{field.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
