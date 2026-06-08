"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, FormRead } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminAnalyticsOverviewPage() {
  const { token } = useAuth();
  const [forms, setForms] = useState<FormRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .getForms(token)
      .then((data) => setForms(data))
      .catch((err) => toast.error(err.message || "Failed to load forms."))
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title="Analytics Overview"
        subtitle="Select a form to view its submissions statistics and reports"
      />

      <main className="flex-1 p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-muted/20 border-2 border-border" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="neo-card text-center py-16">
            <span className="text-5xl" role="img" aria-label="No forms">
              📊
            </span>
            <h3 className="font-bold text-xl mt-4">No Forms Yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Create a form first to start collecting responses and generating statistics.
            </p>
            <Link href="/admin/forms">
              <Button className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold h-10 px-4">
                Go to Forms
              </Button>
            </Link>
          </div>
        ) : (
          <div className="neo-card p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse" id="analytics-overview-table">
              <thead>
                <tr className="border-b-2 border-border bg-muted/50 font-mono text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Form Name</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr
                    key={form.id}
                    className="border-b-2 border-border last:border-0 hover:bg-muted/10"
                  >
                    <td className="p-4">
                      <p className="font-bold">{form.name}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        /f/{form.slug}
                      </p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`neo-pill ${
                          form.is_active
                            ? "bg-green-100 text-green-900 border-green-900"
                            : "bg-red-100 text-red-900 border-red-900"
                        }`}
                      >
                        {form.is_active ? "Active" : "Closed"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/analytics/${form.id}`}>
                        <Button
                          id={`view-analytics-${form.slug}`}
                          className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-sm h-9 px-4"
                        >
                          View Analytics →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
