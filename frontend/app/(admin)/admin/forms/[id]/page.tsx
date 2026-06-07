"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/topbar";
import { FieldPalette } from "@/components/admin/builder/field-palette";
import { BuilderCanvas } from "@/components/admin/builder/builder-canvas";
import { useAuth } from "@/contexts/auth-context";
import { api, FormDetailRead, FormFieldRead } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NeoCard } from "@/components/ui/neo-card";

// Simple Property Panel placeholder for Plan 2.3
function PropertyPanelPlaceholder({ selectedField }: { selectedField: FormFieldRead | null }) {
  return (
    <div className="neo-card p-4 h-fit sticky top-6">
      <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Field Properties</h3>
      {selectedField ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="neo-pill bg-muted text-muted-foreground text-[10px] py-0.5 px-2 font-mono">
              {selectedField.field_type.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-bold">Label: {selectedField.label || "Untitled Field"}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Detailed configurations (labels, placeholders, options, logic) will be fully implementable in Plan 2.4.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a field on the canvas to configure properties.</p>
      )}
    </div>
  );
}

export default function AdminFormBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token } = useAuth();

  const [form, setForm] = useState<FormDetailRead | null>(null);
  const [fields, setFields] = useState<FormFieldRead[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      if (!token || !id) return;
      setIsLoading(true);
      try {
        const data = await api.getForm(id, token);
        setForm(data);
        // Ensure fields are sorted by order
        const sortedFields = [...data.fields].sort((a, b) => a.order - b.order);
        setFields(sortedFields);
      } catch (err: any) {
        toast.error(err.message || "Failed to load form builder.");
        router.push("/admin/forms");
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [token, id, router]);

  const handleAddField = (type: string) => {
    const newField: FormFieldRead = {
      id: crypto.randomUUID(),
      form_id: id,
      field_type: type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: "",
      description: "",
      default_value: "",
      is_required: false,
      order: fields.length,
      options: type === "dropdown" || type === "radio" || type === "checkbox" ? ["Option 1", "Option 2"] : null,
      conditions: null,
      file_accepted_types: type === "file" ? ["application/pdf", "image/png", "image/jpeg"] : null,
      file_max_size_mb: type === "file" ? 5 : null,
      file_max_count: type === "file" ? 1 : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    toast.success(`${type} field added to canvas.`);
  };

  const handleDeleteField = (index: number) => {
    const deleted = fields[index];
    const updated = fields.filter((_, idx) => idx !== index).map((f, idx) => ({ ...f, order: idx }));
    setFields(updated);
    if (selectedFieldId === deleted.id) {
      setSelectedFieldId(null);
    }
    toast.success("Field deleted from canvas.");
  };

  const handleSaveForm = async () => {
    if (!token || !id) return;
    setIsSaving(true);
    try {
      const savedFields = await api.saveFields(id, fields, token);
      setFields(savedFields);
      toast.success("Form fields saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save form fields.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="neo-card text-center p-8">
          <div className="font-mono text-sm text-muted-foreground animate-pulse">Loading Builder...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title={form?.name || "Form Builder"}
        subtitle={`Editing fields for slug: /f/${form?.slug}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/forms")}
              className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-10 px-4"
              disabled={isSaving}
            >
              Back to List
            </Button>
            <Button
              onClick={handleSaveForm}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-10 px-5"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Form"}
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Palette */}
          <div className="col-span-12 md:col-span-3">
            <FieldPalette onAddField={handleAddField} />
          </div>

          {/* Center: Canvas */}
          <div className="col-span-12 md:col-span-6 space-y-4">
            <NeoCard className="p-4 bg-muted/15 font-mono text-xs text-muted-foreground flex justify-between items-center">
              <span>Canvas List — Order changes are saved when clicking Save Form.</span>
              <span className="font-bold">{fields.length} Fields</span>
            </NeoCard>

            <BuilderCanvas
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onDeleteField={handleDeleteField}
              onReorderFields={setFields}
            />
          </div>

          {/* Right: Properties */}
          <div className="col-span-12 md:col-span-3">
            <PropertyPanelPlaceholder selectedField={selectedField} />
          </div>
        </div>
      </main>
    </div>
  );
}
