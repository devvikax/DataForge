"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/topbar";
import { NeoCard } from "@/components/ui/neo-card";
import { useAuth } from "@/contexts/auth-context";
import { api, AdminStats, FormRead } from "@/lib/api";

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [forms, setForms] = useState<FormRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    // Determine greeting based on hour of the day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);

    Promise.all([
      api.getDashboardStats(token),
      api.getForms(token)
    ])
      .then(([statsData, formsData]) => {
        setStats(statsData);
        setForms(formsData);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load dashboard data.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const activeFormsCount = forms.filter((f) => f.is_active).length;

  const statItems = [
    { 
      label: "Forms Created", 
      value: stats ? stats.total_forms : "0", 
      subtext: `${activeFormsCount} active now`,
      icon: "📋", 
      href: "/admin/forms",
      color: "bg-amber-100 border-amber-400"
    },
    { 
      label: "Submissions Logged", 
      value: stats ? stats.total_submissions : "0", 
      subtext: "Across all forms",
      icon: "📥", 
      href: "/admin/submissions",
      color: "bg-blue-100 border-blue-400"
    },
    {
      label: "Form Engine Status",
      value: "100%",
      subtext: "All systems online",
      icon: "⚡",
      href: "/admin/forms",
      color: "bg-emerald-100 border-emerald-400"
    }
  ];

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <AdminTopbar
        title="Dashboard"
        subtitle={`${greeting}${user?.username ? `, ${user.username}` : ""} — Here is what is happening with your forms.`}
      />

      <main className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Welcome Hero Banner */}
        <NeoCard className="bg-gradient-to-r from-accent/20 to-accent-2/15 border-2 border-black p-6 relative overflow-hidden rounded-none shadow-[6px_6px_0px_#000000]">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-xl lg:text-2xl font-black uppercase tracking-tight font-mono mb-2">
              🚀 Control Center
            </h2>
            <p className="text-sm font-semibold mb-4 text-foreground/80">
              Welcome back to DataForge. Create forms, customize fields, view live statistics, and compile custom reports easily.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/forms">
                <button className="neo-btn bg-accent text-foreground hover:bg-accent-hover font-bold text-xs px-4 py-2 flex items-center gap-1">
                  📋 Create / Manage Forms
                </button>
              </Link>
              <Link href="/admin/submissions">
                <button className="neo-btn bg-surface text-foreground hover:bg-neutral-100 font-bold text-xs px-4 py-2 flex items-center gap-1">
                  📥 All Submissions
                </button>
              </Link>
            </div>
          </div>
          <div className="absolute right-4 bottom-0 translate-y-6 text-9xl select-none opacity-10 pointer-events-none font-mono">
            DF
          </div>
        </NeoCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statItems.map((stat) => (
            <Link href={stat.href} key={stat.label} className="block group">
              <NeoCard hover className="flex items-start gap-4 h-full border-2 border-black rounded-none shadow-[4px_4px_0px_#000000] p-4 lg:p-5">
                <div className={`p-3 border-2 border-black rounded-none flex items-center justify-center text-2xl ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  {isLoading ? (
                    <div className="h-8 w-12 bg-muted/20 animate-pulse mt-0.5" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-black mt-0.5">{stat.value}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-wider font-semibold">
                    {stat.subtext}
                  </p>
                </div>
              </NeoCard>
            </Link>
          ))}
        </div>

        {/* Forms Registry Section */}
        <NeoCard className="border-2 border-black rounded-none shadow-[6px_6px_0px_#000000] p-4 lg:p-6">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base font-mono uppercase tracking-tight">
                📋 Forms Registry
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Overview of all generated forms and responses counts
              </p>
            </div>
            <Link href="/admin/forms">
              <button className="neo-btn bg-surface hover:bg-neutral-100 text-xs px-3 py-1.5 font-bold font-mono">
                View All Forms →
              </button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-4">
              <div className="h-8 bg-muted/20 animate-pulse w-full" />
              <div className="h-8 bg-muted/20 animate-pulse w-full" />
              <div className="h-8 bg-muted/20 animate-pulse w-full" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-black">
              <span className="text-2xl">📋</span>
              <h4 className="font-bold font-mono text-sm mt-2">No forms created yet</h4>
              <p className="text-xs text-muted-foreground mt-1">Get started by creating your first form registry</p>
              <Link href="/admin/forms">
                <button className="mt-4 neo-btn bg-accent text-foreground hover:bg-accent-hover text-xs font-bold px-4 py-2">
                  Create Form
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-50 font-mono text-xs uppercase font-bold text-muted-foreground">
                    <th className="p-3 border border-black font-bold">Form Name</th>
                    <th className="p-3 border border-black font-bold">Public Link</th>
                    <th className="p-3 border border-black font-bold text-center w-28">Submissions</th>
                    <th className="p-3 border border-black font-bold text-center w-28">Status</th>
                    <th className="p-3 border border-black font-bold text-center w-64">Quick Links</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.slice(0, 5).map((formItem) => (
                    <tr
                      key={formItem.id}
                      className="border-b border-black hover:bg-neutral-50/50 font-mono text-xs"
                    >
                      <td className="p-3 border border-black font-bold">
                        <Link href={`/admin/forms/${formItem.id}`} className="hover:underline text-accent-2 font-sans font-bold">
                          {formItem.name}
                        </Link>
                        {formItem.description && (
                          <p className="text-[10px] text-muted-foreground font-sans font-normal mt-0.5 truncate max-w-xs">
                            {formItem.description}
                          </p>
                        )}
                      </td>
                      <td className="p-3 border border-black">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyLink(formItem.slug)}
                            className="neo-btn bg-surface hover:bg-neutral-100 p-1 text-[10px] flex items-center justify-center h-6 px-2 shrink-0"
                            title="Copy link to clipboard"
                          >
                            🔗 Copy Link
                          </button>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px] font-sans">
                            /f/{formItem.slug}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border border-black text-center font-bold text-sm">
                        {formItem.submission_counter}
                      </td>
                      <td className="p-3 border border-black text-center">
                        <span className={`neo-pill inline-block ${formItem.is_active ? 'bg-accent text-foreground' : 'bg-neutral-100 text-muted-foreground'}`}>
                          {formItem.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 border border-black">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Link href={`/admin/forms/${formItem.id}`}>
                            <button className="neo-btn bg-surface hover:bg-neutral-100 text-[10px] font-bold h-7 px-2" title="Form Builder">
                              🛠️ Builder
                            </button>
                          </Link>
                          <Link href={`/admin/forms/${formItem.id}/submissions`}>
                            <button className="neo-btn bg-surface hover:bg-neutral-100 text-[10px] font-bold h-7 px-2" title="View Submissions">
                              📥 Entries
                            </button>
                          </Link>
                          <Link href={`/admin/analytics/${formItem.id}`}>
                            <button className="neo-btn bg-surface hover:bg-neutral-100 text-[10px] font-bold h-7 px-2" title="Analytics">
                              📊 Stats
                            </button>
                          </Link>
                          <Link href={`/admin/forms/${formItem.id}/reports`}>
                            <button className="neo-btn bg-surface hover:bg-neutral-100 text-[10px] font-bold h-7 px-2" title="Print Reports">
                              🖨️ Print
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {forms.length > 5 && (
                <div className="text-right mt-3 text-xs font-mono font-bold text-accent-2">
                  <Link href="/admin/forms" className="hover:underline">
                    And {forms.length - 5} more forms...
                  </Link>
                </div>
              )}
            </div>
          )}
        </NeoCard>
      </main>
    </div>
  );
}
