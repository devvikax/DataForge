"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { DailyCount } from "@/lib/api";
import { NeoCard } from "@/components/ui/neo-card";

interface ChartsProps {
  dailyCounts: DailyCount[];
  statusCounts: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",   // Amber
  Verified: "#3b82f6",  // Blue
  Approved: "#10b981",  // Green
  Rejected: "#ef4444",  // Red
  Completed: "#6366f1", // Indigo
  Cancelled: "#6b7280", // Gray
  Archived: "#111827",  // Dark
};

export function AnalyticsCharts({ dailyCounts, statusCounts }: ChartsProps) {
  // Format daily counts to show dates in readable format
  const lineData = dailyCounts.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: d.count,
  }));

  // Format status counts for bar chart
  const barData = Object.entries(statusCounts)
    .filter(([_, count]) => count >= 0)
    .map(([status, count]) => ({
      status,
      count,
      color: STATUS_COLORS[status] || "#000000",
    }));

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Daily Submissions Trend */}
      <NeoCard className="col-span-12 lg:col-span-8 p-6 bg-surface shadow-[4px_4px_0px_#000000]">
        <h3 className="font-bold text-lg mb-4 font-mono">📈 Submission Trend (Last 30 Days)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#4b5563" fontSize={11} className="font-bold font-mono" />
              <YAxis stroke="#4b5563" fontSize={11} className="font-bold font-mono" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #000000",
                  borderRadius: "0px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#000000"
                strokeWidth={3}
                dot={{ stroke: "#000000", strokeWidth: 2, r: 4, fill: "#facc15" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </NeoCard>

      {/* Submissions by Status */}
      <NeoCard className="col-span-12 lg:col-span-4 p-6 bg-surface shadow-[4px_4px_0px_#000000]">
        <h3 className="font-bold text-lg mb-4 font-mono">📊 Submissions by Status</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="status" stroke="#4b5563" fontSize={11} className="font-bold font-mono" />
              <YAxis stroke="#4b5563" fontSize={11} className="font-bold font-mono" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #000000",
                  borderRadius: "0px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                }}
              />
              <Bar dataKey="count" stroke="#000000" strokeWidth={2}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </NeoCard>
    </div>
  );
}
