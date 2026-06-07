"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, FormDetailRead, FormFieldRead, SubmissionRead } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { NeoCard } from "@/components/ui/neo-card";
import { toast } from "sonner";

export default function FormReportsPage() {
  const params = useParams();
  const formId = params.id as string;
  const router = useRouter();
  const { token } = useAuth();

  const [form, setForm] = useState<FormDetailRead | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRead[]>([]);
  const [fields, setFields] = useState<FormFieldRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration
  const [reportType, setReportType] = useState<"nominal" | "registration">("nominal");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token || !formId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const formData = await api.getForm(formId, token);
        setForm(formData);
        const sortedFields = [...formData.fields].sort((a, b) => a.order - b.order);
        setFields(sortedFields);

        // Fetch submissions (limit 10000 to get the full list for print)
        const subData = await api.getSubmissions(formId, { limit: 10000 }, token);
        setSubmissions(subData.submissions);

        // Initialize columns (include basic ones + all field IDs)
        const cols = new Set<string>(["submission_id", "status", "submitted_at"]);
        sortedFields.forEach((f) => cols.add(f.id));
        setSelectedColumns(cols);
      } catch (err: any) {
        toast.error(err.message || "Failed to load reports generator.");
        router.push("/admin/forms");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, formId, router]);

  // Adjust status filter based on report type
  useEffect(() => {
    if (reportType === "registration") {
      setStatusFilter("Approved");
    } else {
      setStatusFilter("");
    }
  }, [reportType]);

  if (isLoading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="neo-card text-center p-8">
          <div className="font-mono text-sm text-muted-foreground animate-pulse">
            Loading Reports Generator...
          </div>
        </div>
      </div>
    );
  }

  // Filter submissions by status
  const filteredSubmissions = submissions.filter((sub) => {
    if (!statusFilter) return true;
    return sub.status === statusFilter;
  });

  const toggleColumn = (colId: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getDisplayValue = (sub: SubmissionRead, fieldId: string): string => {
    const val = sub.values.find((v) => v.field_id === fieldId);
    if (!val) return "—";
    if (val.value_json !== null && val.value_json !== undefined) {
      if (Array.isArray(val.value_json)) return val.value_json.join(", ") || "—";
      return JSON.stringify(val.value_json);
    }
    return val.value_text ?? "—";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Style block for printing */}
      <style jsx global>{`
        @media print {
          /* Hide everything outside print container */
          body * {
            visibility: hidden;
          }
          #printable-report-area,
          #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure table elements print with borders and clear spacing */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th,
          td {
            border: 1px solid #000000 !important;
            padding: 8px !important;
            text-align: left !important;
            color: #000000 !important;
            background: transparent !important;
            font-size: 10pt !important;
          }
          th {
            font-weight: bold !important;
          }
        }
      `}</style>

      <AdminTopbar
        title={`${form.name} — Report Generator`}
        subtitle="Configure filters and columns, then print or save as PDF"
        actions={
          <div className="flex gap-2 no-print">
            <Link href={`/admin/forms/${formId}/submissions`}>
              <Button
                variant="outline"
                className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-10 px-4"
              >
                ← Back
              </Button>
            </Link>
            <Button
              id="print-report-btn"
              onClick={handlePrint}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-10 px-5"
            >
              🖨️ Print Report
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left pane: configuration controls */}
        <div className="col-span-12 lg:col-span-3 space-y-6 overflow-y-auto no-print h-full pr-2">
          {/* Report Type Selector */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2 mb-3">
              📋 Report Template
            </h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                <input
                  type="radio"
                  name="report-type"
                  checked={reportType === "nominal"}
                  onChange={() => setReportType("nominal")}
                  className="w-4 h-4 accent-accent"
                />
                Nominal Roll (All entries list)
              </label>
              <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                <input
                  type="radio"
                  name="report-type"
                  checked={reportType === "registration"}
                  onChange={() => setReportType("registration")}
                  className="w-4 h-4 accent-accent"
                />
                Registration List (Status filtered)
              </label>
            </div>
          </NeoCard>

          {/* Status Filter Selector */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2 mb-3">
              🔍 Filter Status
            </h3>
            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="neo-input h-9 px-2 text-sm bg-surface w-full"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Archived">Archived</option>
            </select>
          </NeoCard>

          {/* Columns Selector */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2 mb-3">
              🗂️ Visible Columns
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.has("submission_id")}
                  onChange={() => toggleColumn("submission_id")}
                  className="w-3.5 h-3.5 accent-accent"
                />
                Submission ID
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.has("status")}
                  onChange={() => toggleColumn("status")}
                  className="w-3.5 h-3.5 accent-accent"
                />
                Status
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.has("submitted_at")}
                  onChange={() => toggleColumn("submitted_at")}
                  className="w-3.5 h-3.5 accent-accent"
                />
                Submitted At
              </label>
              <hr className="border-border my-2" />
              {fields.map((field) => (
                <label
                  key={field.id}
                  className="flex items-center gap-2 text-xs font-mono truncate cursor-pointer"
                  title={field.label}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.has(field.id)}
                    onChange={() => toggleColumn(field.id)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </NeoCard>
        </div>

        {/* Right pane: Preview area */}
        <div className="col-span-12 lg:col-span-9 h-full flex flex-col overflow-y-auto">
          <NeoCard
            id="printable-report-area"
            className="p-8 bg-white text-black border-2 border-black min-h-[29.7cm] w-full flex flex-col rounded-none shadow-[4px_4px_0px_#000000]"
          >
            {/* Report Header */}
            <div className="border-b-4 border-black pb-4 mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight font-mono">
                {reportType === "nominal" ? "NOMINAL ROLL REPORT" : "REGISTRATION LIST REPORT"}
              </h2>
              <p className="text-md font-bold mt-1">Form: {form.name}</p>
              <p className="text-xs font-mono text-muted-foreground mt-2">
                Generated: {new Date().toLocaleString()} | Filter:{" "}
                {statusFilter || "All Entries"} | Count: {filteredSubmissions.length}
              </p>
            </div>

            {/* Submissions List Table */}
            {filteredSubmissions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-black">
                <span className="font-mono font-bold text-sm text-muted-foreground">
                  No records match the active status filter.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-neutral-100 font-mono text-xs uppercase font-bold">
                      <th className="p-2 border border-black font-bold w-12 text-center">S.No</th>
                      {selectedColumns.has("submission_id") && (
                        <th className="p-2 border border-black font-bold">Submission ID</th>
                      )}
                      {selectedColumns.has("status") && (
                        <th className="p-2 border border-black font-bold">Status</th>
                      )}
                      {selectedColumns.has("submitted_at") && (
                        <th className="p-2 border border-black font-bold">Submitted At</th>
                      )}
                      {fields.map(
                        (field) =>
                          selectedColumns.has(field.id) && (
                            <th key={field.id} className="p-2 border border-black font-bold">
                              {field.label}
                            </th>
                          )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub, idx) => (
                      <tr
                        key={sub.id}
                        className="border-b border-black hover:bg-neutral-50 font-mono text-xs"
                      >
                        <td className="p-2 border border-black text-center font-bold">
                          {idx + 1}
                        </td>
                        {selectedColumns.has("submission_id") && (
                          <td className="p-2 border border-black font-sans font-bold">
                            {sub.submission_id}
                          </td>
                        )}
                        {selectedColumns.has("status") && (
                          <td className="p-2 border border-black font-sans">
                            {sub.status}
                          </td>
                        )}
                        {selectedColumns.has("submitted_at") && (
                          <td className="p-2 border border-black text-muted-foreground whitespace-nowrap">
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </td>
                        )}
                        {fields.map(
                          (field) =>
                            selectedColumns.has(field.id) && (
                              <td key={field.id} className="p-2 border border-black font-sans">
                                {getDisplayValue(sub, field.id)}
                              </td>
                            )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer on printed sheet */}
            <div className="mt-8 pt-4 border-t border-dashed border-black flex justify-between font-mono text-[9px] text-muted-foreground">
              <span>DataForge Personal Form System</span>
              <span>Page 1 of 1</span>
            </div>
          </NeoCard>
        </div>
      </main>
    </div>
  );
}
