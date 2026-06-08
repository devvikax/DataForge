"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  FormDetailRead,
  FormFieldRead,
  SubmissionRead,
  PaginatedSubmissions,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge, ALL_STATUSES } from "@/components/admin/submissions/status-badge";
import { SubmissionDetailDrawer } from "@/components/admin/submissions/submission-detail-drawer";
import { toast } from "sonner";

const LIMIT_OPTIONS = [25, 50, 100];

export default function SubmissionsPage() {
  const params = useParams();
  const formId = params.id as string;
  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormDetailRead | null>(null);
  const [fields, setFields] = useState<FormFieldRead[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & sort
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("submitted_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Selection & bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("Verified");

  // Detail drawer
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRead | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!token || !form) return;
    setIsExporting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/forms/${formId}/export/${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${form.slug}_submissions.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported submissions to ${format.toUpperCase()} successfully.`);
    } catch (err: any) {
      toast.error(err.message || `Failed to export to ${format.toUpperCase()}.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 400);
  };

  // Load form metadata once
  useEffect(() => {
    if (!token || !formId) return;
    api
      .getForm(formId, token)
      .then((data) => {
        setForm(data);
        setFields([...data.fields].sort((a, b) => a.order - b.order));
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load form.");
        router.push("/admin/forms");
      });
  }, [token, formId, router]);

  // Load submissions
  const loadSubmissions = useCallback(async () => {
    if (!token || !formId) return;
    setIsLoading(true);
    try {
      const data = await api.getSubmissions(
        formId,
        { page, limit, sort_by: sortBy, sort_order: sortOrder, search: search || undefined, status_filter: statusFilter || undefined },
        token
      );
      setSubmissions(data.submissions);
      setTotalCount(data.total_count);
      setTotalPages(data.total_pages);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Failed to load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [token, formId, page, limit, sortBy, sortOrder, search, statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Sort handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortBy !== column) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const handleBulkStatus = async () => {
    if (!token || selectedIds.size === 0) return;
    try {
      await api.bulkUpdateStatus(Array.from(selectedIds), bulkStatus, token);
      toast.success(`Updated ${selectedIds.size} submission(s) to ${bulkStatus}.`);
      loadSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Bulk update failed.");
    }
  };

  const handleBulkArchive = async () => {
    if (!token || selectedIds.size === 0) return;
    if (!confirm(`Archive ${selectedIds.size} selected submission(s)?`)) return;
    try {
      await api.bulkArchive(Array.from(selectedIds), token);
      toast.success(`Archived ${selectedIds.size} submission(s).`);
      loadSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Bulk archive failed.");
    }
  };

  // Get display value for a field in a submission
  const getDisplayValue = (sub: SubmissionRead, fieldId: string): string => {
    const val = sub.values.find((v) => v.field_id === fieldId);
    if (!val) return "—";
    if (val.value_json !== null && val.value_json !== undefined) {
      if (Array.isArray(val.value_json)) return val.value_json.join(", ") || "—";
      return JSON.stringify(val.value_json);
    }
    return val.value_text ?? "—";
  };

  // Drawer update handler
  const handleDrawerUpdated = (updated: SubmissionRead) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setActiveSubmission(updated);
  };

  const offset = (page - 1) * limit;

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title={form ? `${form.name} — Submissions` : "Submissions"}
        subtitle={`${totalCount} total submission${totalCount !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/admin/forms/${formId}`}>
              <Button
                variant="outline"
                className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-10 px-4"
              >
                ← Form Builder
              </Button>
            </Link>
            <Link href={`/admin/forms/${formId}/reports`}>
              <Button
                id="submissions-reports-btn"
                variant="outline"
                className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-10 px-4"
              >
                📋 Reports
              </Button>
            </Link>
            <Button
              id="export-csv-btn"
              onClick={() => handleExport("csv")}
              disabled={isExporting}
              className="neo-btn bg-accent-2 text-white hover:bg-blue-700 font-bold text-sm h-10 px-4"
            >
              📥 Export CSV
            </Button>
            <Button
              id="export-xlsx-btn"
              onClick={() => handleExport("xlsx")}
              disabled={isExporting}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-10 px-4"
            >
              📥 Export XLSX
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            id="submissions-search"
            type="text"
            placeholder="Search submissions..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="neo-input h-9 px-3 text-sm bg-surface w-64"
          />
          <select
            id="submissions-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="neo-input h-9 px-2 text-sm bg-surface"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            id="submissions-limit"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="neo-input h-9 px-2 text-sm bg-surface"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setStatusFilter("");
                setPage(1);
              }}
              className="neo-btn bg-surface hover:bg-destructive/10 text-sm h-9 px-3 text-destructive border-destructive"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto neo-card p-0">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse border-b-2 border-border bg-muted/20"
                />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-5xl" role="img" aria-label="Empty inbox">📥</span>
              <h3 className="font-bold text-xl mt-4">No Submissions Yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search || statusFilter
                  ? "No submissions match your filters."
                  : "Share the public form link to start collecting responses."}
              </p>
            </div>
          ) : (
            <table
              id="submissions-table"
              className="w-full text-left border-collapse text-sm"
            >
              <thead>
                <tr className="border-b-2 border-border bg-muted/50 font-mono text-xs uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      id="select-all-checkbox"
                      checked={selectedIds.size === submissions.length && submissions.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 cursor-pointer accent-accent"
                    />
                  </th>
                  <th
                    className="p-3 font-bold cursor-pointer hover:bg-muted/30 whitespace-nowrap"
                    onClick={() => handleSort("submission_id")}
                  >
                    Submission ID <SortIndicator column="submission_id" />
                  </th>
                  <th
                    className="p-3 font-bold cursor-pointer hover:bg-muted/30"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIndicator column="status" />
                  </th>
                  <th
                    className="p-3 font-bold cursor-pointer hover:bg-muted/30 whitespace-nowrap"
                    onClick={() => handleSort("submitted_at")}
                  >
                    Submitted At <SortIndicator column="submitted_at" />
                  </th>
                  {fields.map((field) => (
                    <th
                      key={field.id}
                      className="p-3 font-bold cursor-pointer hover:bg-muted/30 max-w-[180px] truncate whitespace-nowrap"
                      onClick={() => handleSort(field.id)}
                      title={field.label}
                    >
                      {field.label} <SortIndicator column={field.id} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const isSelected = selectedIds.has(sub.id);
                  return (
                    <tr
                      key={sub.id}
                      id={`submission-row-${sub.submission_id}`}
                      className={`border-b-2 border-border last:border-0 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-accent/10"
                          : "hover:bg-muted/10"
                      }`}
                      onClick={(e) => {
                        // Only open drawer if NOT clicking checkbox or status
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("input[type=checkbox]") ||
                          target.closest("select")
                        )
                          return;
                        setActiveSubmission(sub);
                      }}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(sub.id)}
                          className="size-4 cursor-pointer accent-accent"
                          aria-label={`Select ${sub.submission_id}`}
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-xs whitespace-nowrap">
                        {sub.submission_id}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      {fields.map((field) => (
                        <td
                          key={field.id}
                          className="p-3 max-w-[180px] truncate text-xs"
                          title={getDisplayValue(sub, field.id)}
                        >
                          {getDisplayValue(sub, field.id)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && submissions.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-muted-foreground font-mono">
              Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2 items-center">
              <Button
                id="pagination-prev-btn"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="neo-btn bg-surface hover:bg-neutral-100 h-8 px-3 text-xs font-bold"
              >
                ← Prev
              </Button>
              <span className="font-mono text-xs font-bold">
                Page {page} of {totalPages}
              </span>
              <Button
                id="pagination-next-btn"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="neo-btn bg-surface hover:bg-neutral-100 h-8 px-3 text-xs font-bold"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div
          id="bulk-action-bar"
          className="sticky bottom-0 border-t-2 border-border bg-accent px-6 py-3 flex items-center gap-4 flex-wrap"
        >
          <span className="font-bold text-sm">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 items-center flex-1">
            <select
              id="bulk-status-select"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="neo-input h-8 px-2 text-sm bg-white"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button
              id="bulk-update-status-btn"
              onClick={handleBulkStatus}
              className="neo-btn bg-foreground text-background hover:bg-foreground/80 h-8 px-3 text-xs font-bold"
            >
              Apply Status
            </Button>
            <Button
              id="bulk-archive-btn"
              onClick={handleBulkArchive}
              className="neo-btn bg-surface hover:bg-destructive/10 text-destructive border-destructive h-8 px-3 text-xs font-bold"
            >
              Archive Selected
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="neo-btn bg-surface hover:bg-neutral-100 h-8 px-3 text-xs font-bold"
          >
            Deselect All
          </Button>
        </div>
      )}

      {/* Detail Drawer */}
      <SubmissionDetailDrawer
        submission={activeSubmission}
        fields={fields}
        onClose={() => setActiveSubmission(null)}
        onUpdated={handleDrawerUpdated}
      />
    </div>
  );
}
