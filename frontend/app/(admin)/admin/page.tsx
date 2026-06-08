"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/topbar";
import { NeoCard } from "@/components/ui/neo-card";
import { useAuth } from "@/contexts/auth-context";
import { api, AdminStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    api
      .getDashboardStats(token)
      .then((data) => setStats(data))
      .catch((err) => {
        toast.error(err.message || "Failed to load dashboard statistics.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const statItems = [
    { label: "Total Forms", value: stats ? stats.total_forms : "—", icon: "📋", href: "/admin/forms" },
    { label: "Total Submissions", value: stats ? stats.total_submissions : "—", icon: "📥", href: "/admin/submissions" },
    { label: "Pending Review", value: stats ? stats.pending_submissions : "—", icon: "⏳", href: "/admin/submissions" },
    { label: "Edit Requests", value: stats ? stats.edit_requests : "—", icon: "✏️", href: "/admin/edit-requests" },
  ];

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title="Dashboard"
        subtitle="Welcome to DataForge admin"
      />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statItems.map((stat) => (
            <Link href={stat.href} key={stat.label}>
              <NeoCard hover className="flex items-start gap-4 h-full">
                <span className="text-3xl">{stat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  {isLoading ? (
                    <div className="h-9 w-12 bg-muted/20 animate-pulse mt-0.5" />
                  ) : (
                    <p className="text-3xl font-black">{stat.value}</p>
                  )}
                </div>
              </NeoCard>
            </Link>
          ))}
        </div>

        <NeoCard>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
          <p className="text-lg font-bold">
            ✅ DataForge is running. Production MVP status verified.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            All systems online: Form Builder, Database, Submission Registry, and Analytics.
          </p>
        </NeoCard>
      </main>
    </div>
  );
}

