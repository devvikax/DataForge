"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminTopbar } from "@/components/admin/topbar";
import { FormSettingsModal } from "@/components/admin/form-settings-modal";
import { NeoCard } from "@/components/ui/neo-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, FormRead } from "@/lib/api";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminFormsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [forms, setForms] = useState<FormRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormRead | null>(null);

  const loadForms = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const fetchedForms = await api.getForms(token);
      setForms(fetchedForms);
    } catch (err: any) {
      toast.error(err.message || "Failed to load forms.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, [token]);

  const handleCreateOrUpdate = async (data: { name: string; slug: string; description: string; is_active: boolean }) => {
    if (!token) return;
    try {
      if (editingForm) {
        // Update existing form settings
        await api.updateForm(editingForm.id, data, token);
        toast.success("Form settings updated successfully.");
      } else {
        // Create new form
        const newForm = await api.createForm(data, token);
        toast.success("New form created successfully.");
        router.push(`/admin/forms/${newForm.id}`);
        return;
      }
      loadForms();
    } catch (err: any) {
      throw err; // FormSettingsModal catches this to display inline error
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this form? This will permanently delete all form fields and submission data.")) {
      return;
    }
    try {
      await api.deleteForm(id, token);
      toast.success("Form deleted successfully.");
      loadForms();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete form.");
    }
  };

  const toggleFormActive = async (form: FormRead) => {
    if (!token) return;
    try {
      await api.updateForm(form.id, { is_active: !form.is_active }, token);
      toast.success(`Form is now ${!form.is_active ? "Open" : "Closed"}.`);
      loadForms();
    } catch (err: any) {
      toast.error(err.message || "Failed to update form status.");
    }
  };

  const openCreateModal = () => {
    setEditingForm(null);
    setIsModalOpen(true);
  };

  const openEditModal = (form: FormRead) => {
    setEditingForm(form);
    setIsModalOpen(true);
  };

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.protocol}//${window.location.host}/f/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Public form link copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title="Forms Management"
        subtitle="Create forms, edit schemas, and configure settings"
        actions={
          <Button
            onClick={openCreateModal}
            className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm px-4 h-10"
          >
            Create Form +
          </Button>
        }
      />

      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse bg-surface border-2 border-border" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <NeoCard className="text-center py-12">
            <span className="text-4xl" role="img" aria-label="Forms placeholder">📋</span>
            <h3 className="text-xl font-bold mt-3">No Forms Created Yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Create your first form to start collecting responses.
            </p>
            <Button
              onClick={openCreateModal}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold h-10 px-4"
            >
              Get Started
            </Button>
          </NeoCard>
        ) : (
          <div className="neo-card p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse" id="forms-list-table">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50 font-mono text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Form Name</th>
                  <th className="p-4 font-bold">Slug</th>
                  <th className="p-4 font-bold">Active Status</th>
                  <th className="p-4 font-bold">Created At</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id} className="border-b-2 border-border last:border-0 hover:bg-muted/10">
                    <td className="p-4">
                      <Link
                        href={`/admin/forms/${form.id}`}
                        className="font-bold text-lg hover:text-accent-2 hover:underline"
                        id={`form-link-${form.slug}`}
                      >
                        {form.name}
                      </Link>
                      {form.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{form.description}</p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-sm">{form.slug}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleFormActive(form)}
                        id={`active-toggle-${form.slug}`}
                        className={`neo-pill cursor-pointer transition-colors ${
                          form.is_active
                            ? "bg-green-100 text-green-900 border-green-900 hover:bg-green-200"
                            : "bg-red-100 text-red-900 border-red-900 hover:bg-red-200"
                        }`}
                      >
                        {form.is_active ? "Active" : "Closed"}
                      </button>
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {new Date(form.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => copyPublicLink(form.slug)}
                          className="neo-btn bg-surface hover:bg-neutral-100 h-9 px-3 text-xs"
                          title="Copy Public Form Link"
                          id={`copy-link-btn-${form.slug}`}
                        >
                          🔗 Copy Link
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                className="neo-btn bg-surface hover:bg-neutral-100 h-9 px-3 text-xs"
                                id={`actions-menu-${form.slug}`}
                              >
                                ⚙️ Actions
                              </Button>
                            }
                          />
                          <DropdownMenuContent className="rounded-none neo-border bg-background">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/forms/${form.id}/submissions`)}
                              className="font-semibold text-sm cursor-pointer"
                              id={`submissions-btn-${form.slug}`}
                            >
                              📥 Submissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/analytics/${form.id}`)}
                              className="font-semibold text-sm cursor-pointer"
                              id={`analytics-btn-${form.slug}`}
                            >
                              📊 Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/forms/${form.id}/reports`)}
                              className="font-semibold text-sm cursor-pointer"
                              id={`reports-btn-${form.slug}`}
                            >
                              📋 Reports & Printing
                            </DropdownMenuItem>
                            <hr className="border-border my-1" />
                            <DropdownMenuItem
                              onClick={() => openEditModal(form)}
                              className="font-semibold text-sm cursor-pointer"
                              id={`edit-settings-btn-${form.slug}`}
                            >
                              Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(form.id)}
                              className="font-semibold text-sm text-danger cursor-pointer hover:bg-red-50"
                              id={`delete-form-btn-${form.slug}`}
                            >
                              Delete Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <FormSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateOrUpdate}
        form={editingForm}
      />
    </div>
  );
}
