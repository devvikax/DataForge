"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormRead } from "@/lib/api";

interface FormSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; slug: string; description: string; is_active: boolean }) => Promise<void>;
  form?: FormRead | null; // If editing
}

export function FormSettingsModal({ isOpen, onClose, onSave, form }: FormSettingsModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize fields on form change or open
  useEffect(() => {
    if (isOpen) {
      if (form) {
        setName(form.name);
        setSlug(form.slug);
        setDescription(form.description ?? "");
        setIsActive(form.is_active);
      } else {
        setName("");
        setSlug("");
        setDescription("");
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, form]);

  // Handle name change and auto-slugify
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    // Only auto-slugify if not editing an existing form
    if (!form) {
      const generatedSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") // remove special chars
        .replace(/\s+/g, "-")         // replace spaces with hyphens
        .replace(/-+/g, "-")          // deduplicate hyphens
        .trim();
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (!name.trim()) {
      setError("Form name is required.");
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slug.trim()) {
      setError("Form slug is required.");
      return;
    }
    if (!slugRegex.test(slug)) {
      setError("Slug must contain only lowercase letters, numbers, and hyphens.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({ name, slug, description, is_active: isActive });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-none neo-border bg-background p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            {form ? "Edit Form Settings" : "Create New Form"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4" id="form-settings-form">
          <div className="space-y-1.5">
            <Label htmlFor="form-name" className="font-bold">Form Name</Label>
            <Input
              id="form-name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Workshop Registration"
              className="neo-input h-10"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-slug" className="font-bold">Form Slug (URL Identifier)</Label>
            <div className="flex flex-col gap-1">
              <Input
                id="form-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="workshop-registration"
                className="neo-input h-10"
                required
                disabled={!!form} // Disallow slug updates for existing forms to prevent breaking URLs
              />
              <span className="font-mono text-xs text-muted-foreground">
                Public Link: /f/{slug || "..."}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-desc" className="font-bold">Description (Optional)</Label>
            <textarea
              id="form-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or instructions for submitters..."
              className="w-full min-h-[80px] p-2.5 neo-input text-sm"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <input
              id="form-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-5 rounded-none accent-accent border-2 border-black"
            />
            <Label htmlFor="form-active" className="font-bold select-none cursor-pointer">
              Active (Open for Submissions)
            </Label>
          </div>

          {error && (
            <div className="neo-border border-destructive bg-destructive/10 p-3 text-destructive text-sm font-medium animate-shake" role="alert">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="neo-btn bg-surface hover:bg-neutral-100 h-10 px-4"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover h-10 px-4 font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
