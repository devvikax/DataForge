import type { Metadata } from "next";
import { AdminTopbar } from "@/components/admin/topbar";
import { NeoCard } from "@/components/ui/neo-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title="Dashboard"
        subtitle="Welcome to DataForge admin"
      />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Forms", value: "—", icon: "📋" },
            { label: "Total Submissions", value: "—", icon: "📥" },
            { label: "Pending Review", value: "—", icon: "⏳" },
            { label: "Edit Requests", value: "—", icon: "✏️" },
          ].map((stat) => (
            <NeoCard key={stat.label} className="flex items-start gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value}</p>
              </div>
            </NeoCard>
          ))}
        </div>

        <NeoCard>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">Status</p>
          <p className="text-lg font-bold">
            ✅ DataForge is running. Phase 1 complete.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Start by creating your first form in the <strong>Forms</strong> section.
          </p>
        </NeoCard>
      </main>
    </div>
  );
}
