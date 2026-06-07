"use client";

import { useEffect, useState, useCallback } from "react";
import { api, EditRequestRead } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AdminTopbar } from "@/components/admin/topbar";
import { EditRequestCard } from "@/components/admin/edit-requests/edit-request-card";
import { toast } from "sonner";

const TABS = [
  { key: "pending", label: "Pending", icon: "🕐" },
  { key: "approved", label: "Approved", icon: "✅" },
  { key: "rejected", label: "Rejected", icon: "❌" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function EditRequestsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [requests, setRequests] = useState<EditRequestRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getEditRequests(null, token);
      setRequests(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load edit requests.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleUpdated = (updated: EditRequestRead) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const filtered = requests.filter((r) => r.status === activeTab);

  return (
    <div className="flex flex-col h-full">
      <AdminTopbar
        title="Edit Requests"
        subtitle="Review and manage submission edit requests from public submitters"
      />

      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Tabs */}
        <div
          id="edit-requests-tabs"
          className="flex border-2 border-border overflow-hidden"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-r-2 last:border-r-0 border-border ${
                activeTab === tab.key
                  ? "bg-accent text-foreground"
                  : "bg-surface hover:bg-muted/20"
              }`}
            >
              <span role="img" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
              <span
                className={`neo-pill text-[10px] ${
                  activeTab === tab.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted border-border"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse bg-muted/20 border-2 border-border border-l-4 border-l-yellow-300"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 neo-card">
            <span className="text-5xl" role="img" aria-label="Empty">
              {activeTab === "pending" ? "📭" : activeTab === "approved" ? "📬" : "📪"}
            </span>
            <h3 className="font-bold text-xl mt-4">
              No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {activeTab === "pending"
                ? "No edit requests are waiting for your review."
                : activeTab === "approved"
                ? "No approved edit requests to display."
                : "No rejected edit requests to display."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <EditRequestCard
                key={req.id}
                request={req}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
