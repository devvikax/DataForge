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

const THEME_COLORS: Record<string, { hex: string; bgHex: string; borderClass: string; bgClass: string; textClass: string }> = {
  black: { hex: "#000000", bgHex: "#f5f5f5", borderClass: "border-black", bgClass: "bg-neutral-100", textClass: "text-black" },
  navy: { hex: "#1e3a8a", bgHex: "#eff6ff", borderClass: "border-blue-900", bgClass: "bg-blue-50", textClass: "text-blue-900" },
  emerald: { hex: "#065f46", bgHex: "#ecfdf5", borderClass: "border-emerald-800", bgClass: "bg-emerald-50", textClass: "text-emerald-800" },
  slate: { hex: "#374151", bgHex: "#f8fafc", borderClass: "border-gray-700", bgClass: "bg-slate-50", textClass: "text-slate-700" },
};

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
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  // Customization States
  const [reportTitle, setReportTitle] = useState("Nominal Roll Report");
  const [reportSubtitle, setReportSubtitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFooterText, setReportFooterText] = useState("DataForge Personal Form System");
  const [fontSize, setFontSize] = useState("10pt");
  const [tableStyle, setTableStyle] = useState("boxy"); // boxy, borderless, zebra, compact
  const [showSNo, setShowSNo] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showSignColumn, setShowSignColumn] = useState(false);
  const [themeColor, setThemeColor] = useState("black"); // black, navy, emerald, slate

  // Custom Blank Columns Creator
  const [customBlankColumns, setCustomBlankColumns] = useState<string[]>([]);
  const [newBlankColName, setNewBlankColName] = useState("");

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
        const cols = new Set<string>(["submission_id", "submitted_at"]);
        sortedFields.forEach((f) => cols.add(f.id));
        setSelectedColumns(cols);

        // Set default subtitle based on form name
        setReportSubtitle(`Form: ${formData.name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to load reports generator.");
        router.push("/admin/forms");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, formId, router]);

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

  const handleReset = () => {
    setReportTitle("Nominal Roll Report");
    setReportSubtitle(form ? `Form: ${form.name}` : "");
    setReportDescription("");
    setReportFooterText("DataForge Personal Form System");
    setFontSize("10pt");
    setTableStyle("boxy");
    setShowSNo(true);
    setShowTimestamp(true);
    setShowSignColumn(false);
    setThemeColor("black");
    setCustomBlankColumns([]);
    setNewBlankColName("");

    // Reset columns checklist
    const cols = new Set<string>(["submission_id", "submitted_at"]);
    fields.forEach((f) => cols.add(f.id));
    setSelectedColumns(cols);
  };

  const handleAddBlankColumn = () => {
    const name = newBlankColName.trim();
    if (!name) return;
    setCustomBlankColumns((prev) => [...prev, name]);
    setNewBlankColName("");
  };

  const handleRemoveBlankColumn = (index: number) => {
    setCustomBlankColumns((prev) => prev.filter((_, idx) => idx !== index));
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

  const filteredSubmissions = submissions;

  // Table style helpers for live preview rendering
  const cellPadding = tableStyle === "compact" ? "p-1.5 text-[10px]" : "p-3";
  const cellBorder = (tableStyle === "boxy" || tableStyle === "compact") ? "border" : "border-b border-neutral-200";
  const rowBg = tableStyle === "zebra" ? "odd:bg-white even:bg-neutral-50" : "bg-white hover:bg-neutral-50";
  const headerBorder = (tableStyle === "boxy" || tableStyle === "compact") ? "border" : "border-b-2";

  return (
    <div className="flex flex-col h-full">
      {/* Style block for printing */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 1.5cm;
        }
        @media print {
          /* Hide sidebars, topbars, and configuration controls completely from layout */
          aside,
          #admin-sidebar,
          header,
          .no-print {
            display: none !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

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
            height: auto !important;
            min-height: auto !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            font-size: ${fontSize} !important;
          }
          
          /* Table Styles */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          
          th, td {
            padding: ${tableStyle === "compact" ? "4px" : "8px"} !important;
            text-align: left !important;
            font-size: ${fontSize} !important;
            background: transparent !important;
          }

          th {
            font-weight: bold !important;
          }

          /* Theme Colors and Table Styles override */
          ${tableStyle === "boxy" || tableStyle === "compact" ? `
            th, td {
              border: 1px solid ${THEME_COLORS[themeColor].hex} !important;
            }
          ` : `
            th {
              border-bottom: 2px solid ${THEME_COLORS[themeColor].hex} !important;
            }
            td {
              border-bottom: 1px solid #e5e7eb !important;
            }
          `}

          th {
            color: ${THEME_COLORS[themeColor].hex} !important;
            background-color: ${tableStyle === "zebra" ? "#f9fafb" : THEME_COLORS[themeColor].bgHex} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          ${tableStyle === "zebra" ? `
            tr:nth-child(even) td {
              background-color: #f9fafb !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          ` : ""}
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

          {/* Report Customizer */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black space-y-4">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2">
              ⚙️ Customize Report
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full"
                  placeholder="Nominal Roll Report"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Subtitle</label>
                <input
                  type="text"
                  value={reportSubtitle}
                  onChange={(e) => setReportSubtitle(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full"
                  placeholder={`Form: ${form.name}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Description / Notes</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="neo-input p-2 text-xs bg-card w-full h-16 resize-none"
                  placeholder="Add custom notes or details to print below the header..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Footer Text</label>
                <input
                  type="text"
                  value={reportFooterText}
                  onChange={(e) => setReportFooterText(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full"
                  placeholder="DataForge Personal Form System"
                />
              </div>
            </div>
          </NeoCard>

          {/* Design & Layout Customizer */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black space-y-4">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2">
              🎨 Design & Layout
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Theme Accent</label>
                <select
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full font-sans font-medium"
                >
                  <option value="black">Classic Monochrome</option>
                  <option value="navy">Executive Navy</option>
                  <option value="emerald">Forest Emerald</option>
                  <option value="slate">Charcoal Slate</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Table Template</label>
                <select
                  value={tableStyle}
                  onChange={(e) => setTableStyle(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full font-sans font-medium"
                >
                  <option value="boxy">Boxy Grid (Classic)</option>
                  <option value="borderless">Modern Row Dividers</option>
                  <option value="zebra">Zebra Striped Rows</option>
                  <option value="compact">High Density Compact</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 font-mono text-muted-foreground">Font Size</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="neo-input h-9 px-2 text-xs bg-card w-full font-sans font-medium"
                >
                  <option value="8pt">Small (8pt)</option>
                  <option value="10pt">Medium (10pt)</option>
                  <option value="12pt">Large (12pt)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1 border-t border-dashed border-border mt-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSNo}
                    onChange={(e) => setShowSNo(e.target.checked)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  Show Serial Numbers
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTimestamp}
                    onChange={(e) => setShowTimestamp(e.target.checked)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  Show Timestamp
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignColumn}
                    onChange={(e) => setShowSignColumn(e.target.checked)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  Add Checklist Column
                </label>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-2 neo-btn bg-destructive/10 text-destructive hover:bg-destructive hover:text-white hover:border-destructive font-bold text-xs py-2 transition-all duration-100"
            >
              🔄 Reset to Defaults
            </button>
          </NeoCard>

          {/* Custom Blank Columns Creator */}
          <NeoCard className="p-4 bg-surface shadow-[4px_4px_0px_#000000] rounded-none border-2 border-black space-y-4">
            <h3 className="font-bold text-sm font-mono border-b border-border pb-2">
              📝 Custom Blank Columns
            </h3>
            
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-mono">
                Create custom blank columns (e.g., Remarks, Checked By, Date) for physical markings.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlankColName}
                  onChange={(e) => setNewBlankColName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBlankColumn();
                    }
                  }}
                  className="neo-input h-9 px-2 text-xs bg-card flex-1 font-mono"
                  placeholder="e.g. Remarks"
                />
                <Button
                  onClick={handleAddBlankColumn}
                  className="neo-btn bg-accent text-foreground text-xs h-9 px-3 shrink-0"
                >
                  Add
                </Button>
              </div>

              {customBlankColumns.length > 0 && (
                <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                  {customBlankColumns.map((col, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-card border border-border p-2 font-mono text-xs">
                      <span className="truncate pr-2 font-bold">{col}</span>
                      <button
                        onClick={() => handleRemoveBlankColumn(idx)}
                        className="text-destructive hover:text-destructive/80 font-bold px-1.5"
                        title="Remove Column"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            className="p-8 bg-white text-black border-2 min-h-[29.7cm] w-full max-w-[21cm] mx-auto flex flex-col rounded-none shadow-[4px_4px_0px_#000000]"
            style={{ 
              fontSize: fontSize,
              borderColor: THEME_COLORS[themeColor].hex 
            }}
          >
            {/* Report Header */}
            <div 
              className="border-b-4 pb-4 mb-6"
              style={{ borderColor: THEME_COLORS[themeColor].hex }}
            >
              <h2 
                className="text-2xl font-black uppercase tracking-tight font-mono"
                style={{ color: THEME_COLORS[themeColor].hex }}
              >
                {reportTitle || "REPORT"}
              </h2>
              {reportSubtitle && (
                <p className="text-md font-bold mt-1" style={{ color: themeColor === "black" ? "#000000" : THEME_COLORS[themeColor].hex }}>
                  {reportSubtitle}
                </p>
              )}
              {reportDescription && (
                <p className="text-xs font-mono text-muted-foreground mt-3 border-l-4 pl-3 py-1 italic bg-neutral-50/50" style={{ borderColor: THEME_COLORS[themeColor].hex }}>
                  {reportDescription}
                </p>
              )}
              {showTimestamp && (
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  Generated: {new Date().toLocaleString()} | Count: {filteredSubmissions.length}
                </p>
              )}
            </div>

            {/* Submissions List Table */}
            {filteredSubmissions.length === 0 ? (
              <div 
                className="flex-1 flex items-center justify-center p-8 border-2 border-dashed"
                style={{ borderColor: THEME_COLORS[themeColor].hex }}
              >
                <span className="font-mono font-bold text-sm text-muted-foreground">
                  No submission records found.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr 
                      className="font-mono text-xs uppercase font-bold"
                      style={{ 
                        backgroundColor: THEME_COLORS[themeColor].bgHex,
                        color: THEME_COLORS[themeColor].hex,
                      }}
                    >
                      {showSNo && (
                        <th 
                          className={`${cellPadding} ${headerBorder} font-bold w-12 text-center`}
                          style={{ borderColor: THEME_COLORS[themeColor].hex }}
                        >
                          S.No
                        </th>
                      )}
                      {selectedColumns.has("submission_id") && (
                        <th 
                          className={`${cellPadding} ${headerBorder} font-bold`}
                          style={{ borderColor: THEME_COLORS[themeColor].hex }}
                        >
                          Submission ID
                        </th>
                      )}

                      {selectedColumns.has("submitted_at") && (
                        <th 
                          className={`${cellPadding} ${headerBorder} font-bold`}
                          style={{ borderColor: THEME_COLORS[themeColor].hex }}
                        >
                          Submitted At
                        </th>
                      )}
                      {fields.map(
                        (field) =>
                          selectedColumns.has(field.id) && (
                            <th 
                              key={field.id} 
                              className={`${cellPadding} ${headerBorder} font-bold`}
                              style={{ borderColor: THEME_COLORS[themeColor].hex }}
                            >
                              {field.label}
                            </th>
                          )
                      )}
                      {showSignColumn && (
                        <th 
                          className={`${cellPadding} ${headerBorder} font-bold text-center w-32`}
                          style={{ borderColor: THEME_COLORS[themeColor].hex }}
                        >
                          Signature / Check
                        </th>
                      )}
                      {customBlankColumns.map((colName, idx) => (
                        <th 
                          key={`blank-col-${idx}`} 
                          className={`${cellPadding} ${headerBorder} font-bold text-center w-36`}
                          style={{ borderColor: THEME_COLORS[themeColor].hex }}
                        >
                          {colName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub, idx) => (
                      <tr
                        key={sub.id}
                        className={`font-mono text-xs ${rowBg}`}
                      >
                        {showSNo && (
                          <td 
                            className={`${cellPadding} ${cellBorder} text-center font-bold`}
                            style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                          >
                            {idx + 1}
                          </td>
                        )}
                        {selectedColumns.has("submission_id") && (
                          <td 
                            className={`${cellPadding} ${cellBorder} font-sans font-bold`}
                            style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                          >
                            {sub.submission_id}
                          </td>
                        )}

                        {selectedColumns.has("submitted_at") && (
                          <td 
                            className={`${cellPadding} ${cellBorder} text-muted-foreground whitespace-nowrap`}
                            style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                          >
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </td>
                        )}
                        {fields.map(
                          (field) =>
                            selectedColumns.has(field.id) && (
                              <td 
                                key={field.id} 
                                className={`${cellPadding} ${cellBorder} font-sans`}
                                style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                              >
                                {getDisplayValue(sub, field.id)}
                              </td>
                            )
                        )}
                        {showSignColumn && (
                          <td 
                            className={`${cellPadding} ${cellBorder} text-center`}
                            style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                          >
                            <span className="inline-block w-4 h-4 border border-neutral-300 bg-transparent rounded-sm"></span>
                          </td>
                        )}
                        {customBlankColumns.map((_, idx) => (
                          <td 
                            key={`blank-cell-${idx}`} 
                            className={`${cellPadding} ${cellBorder} text-center`}
                            style={{ borderColor: (tableStyle === "boxy" || tableStyle === "compact") ? THEME_COLORS[themeColor].hex : undefined }}
                          >
                            <span className="block h-5 bg-transparent"></span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer on printed sheet */}
            <div 
              className="mt-8 pt-4 border-t border-dashed flex justify-between font-mono text-[9px] text-muted-foreground"
              style={{ borderColor: THEME_COLORS[themeColor].hex }}
            >
              <span>{reportFooterText || "DataForge Personal Form System"}</span>
              <span>Page 1 of 1</span>
            </div>
          </NeoCard>
        </div>
      </main>
    </div>
  );
}
