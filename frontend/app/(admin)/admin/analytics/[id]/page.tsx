"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, FormDetailRead, FormAnalytics } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { NeoCard } from "@/components/ui/neo-card";
import { toast } from "sonner";

const AnalyticsCharts = dynamic(
  () => import("@/components/admin/analytics/charts").then((mod) => mod.AnalyticsCharts),
  { ssr: false }
);

export default function FormAnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token } = useAuth();

  const [form, setForm] = useState<FormDetailRead | null>(null);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (forceRefresh = false) => {
    if (!token || !id) return;
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [formMetadata, stats] = await Promise.all([
        api.getForm(id, token),
        api.getFormAnalytics(id, token, forceRefresh),
      ]);
      setForm(formMetadata);
      setAnalytics(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to load analytics dashboard.");
      router.push("/admin/analytics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, id]);

  if (isLoading || !form || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="neo-card text-center p-8">
          <div className="font-mono text-sm text-muted-foreground animate-pulse">
            Compiling Analytics Dashboard...
          </div>
        </div>
      </div>
    );
  }

  // Filter fields to only choice fields to render choice distributions
  const choiceFields = form.fields.filter(
    (f) =>
      f.field_type === "dropdown" ||
      f.field_type === "radio" ||
      f.field_type === "checkbox"
  );

  const otherFields = form.fields.filter(
    (f) =>
      f.field_type !== "dropdown" &&
      f.field_type !== "radio" &&
      f.field_type !== "checkbox"
  );

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title={`${form.name} — Analytics`}
        subtitle={`Compiled statistics for slug: /f/${form.slug}`}
        actions={
          <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-end">
            <Link href="/admin/analytics">
              <Button
                variant="outline"
                className="neo-btn bg-surface hover:bg-neutral-100 font-bold text-sm h-10 px-4"
                disabled={isRefreshing}
              >
                ← Back
              </Button>
            </Link>
            <Button
              id="refresh-analytics-btn"
              onClick={() => loadData(true)}
              className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-10 px-4"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh Data 🔄"}
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-12 gap-6">
          <NeoCard className="col-span-12 sm:col-span-6 p-5 bg-surface shadow-[4px_4px_0px_#000000]">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Total Submissions
            </p>
            <p className="text-3xl font-black mt-2 font-mono" id="kpi-total-submissions">
              {analytics.total_submissions}
            </p>
          </NeoCard>

          <NeoCard className="col-span-12 sm:col-span-6 p-5 bg-surface shadow-[4px_4px_0px_#000000]">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Submissions Today
            </p>
            <p className="text-3xl font-black mt-2 font-mono" id="kpi-today-submissions">
              {analytics.today_submissions}
            </p>
          </NeoCard>
        </div>

        {/* Charts Component */}
        <AnalyticsCharts
          dailyCounts={analytics.daily_counts}
        />

        {/* Choice Distributions */}
        {choiceFields.length > 0 && (
          <div>
            <h3 className="text-xl font-black tracking-tight mb-4 font-mono">
              🔘 Choice Field Distributions
            </h3>
            <div className="grid grid-cols-12 gap-6">
              {choiceFields.map((field) => {
                const stat = analytics.field_stats[field.id];
                if (!stat || !stat.value_distribution) return null;

                const totalValues = Object.values(stat.value_distribution).reduce(
                  (a, b) => a + b,
                  0
                );

                return (
                  <NeoCard
                    key={field.id}
                    className="col-span-12 md:col-span-6 p-5 bg-surface shadow-[4px_4px_0px_#000000]"
                  >
                    <div className="flex justify-between items-center border-b border-border pb-2 mb-4">
                      <h4 className="font-bold font-mono text-base truncate pr-2">
                        {field.label}
                      </h4>
                      <span className="neo-pill bg-accent/20 text-xs font-bold font-mono">
                        {field.field_type}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(stat.value_distribution).map(([opt, count]) => {
                        const pct =
                          totalValues > 0
                            ? ((count / totalValues) * 100).toFixed(1)
                            : "0.0";

                        return (
                          <div key={opt} className="space-y-1">
                            <div className="flex justify-between font-mono text-xs font-bold">
                              <span>{opt}</span>
                              <span>
                                {pct}% ({count})
                              </span>
                            </div>
                            <div className="w-full bg-muted border-2 border-border h-4 overflow-hidden relative">
                              <div
                                className="bg-accent h-full border-r-2 border-border"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex justify-between font-mono text-xs text-muted-foreground">
                      <span>Response Rate: {stat.response_rate}%</span>
                      <span>Unique Choices: {stat.unique_count}</span>
                    </div>
                  </NeoCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Other Field Stats */}
        {otherFields.length > 0 && (
          <div>
            <h3 className="text-xl font-black tracking-tight mb-4 font-mono">
              📝 Other Fields Response Rates
            </h3>
            <div className="neo-card p-0 overflow-x-auto shadow-[4px_4px_0px_#000000]">
              <table className="w-full text-left border-collapse" id="field-stats-table">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/50 font-mono text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">Field Label</th>
                    <th className="p-4 font-bold">Field Type</th>
                    <th className="p-4 font-bold text-center">Response Rate</th>
                    <th className="p-4 font-bold text-center">Unique Values</th>
                  </tr>
                </thead>
                <tbody>
                  {otherFields.map((field) => {
                    const stat = analytics.field_stats[field.id];
                    if (!stat) return null;

                    return (
                      <tr
                        key={field.id}
                        className="border-b-2 border-border last:border-0 hover:bg-muted/10 font-mono text-sm"
                      >
                        <td className="p-4 font-sans font-bold">{field.label}</td>
                        <td className="p-4">
                          <span className="neo-pill bg-muted/50 font-bold text-xs uppercase">
                            {field.field_type}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-muted border border-border h-3 overflow-hidden relative hidden sm:block">
                              <div
                                className="bg-accent-2 h-full"
                                style={{ width: `${stat.response_rate}%` }}
                              />
                            </div>
                            <span className="font-bold">{stat.response_rate}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold">
                          {stat.unique_count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="font-mono text-xs text-muted-foreground text-center">
          Computed at: {new Date(analytics.computed_at).toLocaleString()}
        </div>
      </main>
    </div>
  );
}
