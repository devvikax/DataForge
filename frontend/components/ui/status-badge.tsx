import { cn } from "@/lib/utils";

type Status = "pending" | "verified" | "approved" | "rejected" | "completed" | "cancelled" | "archived";

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-900 border-yellow-900" },
  verified:  { label: "Verified",  className: "bg-blue-100 text-blue-900 border-blue-900" },
  approved:  { label: "Approved",  className: "bg-green-100 text-green-900 border-green-900" },
  rejected:  { label: "Rejected",  className: "bg-red-100 text-red-900 border-red-900" },
  completed: { label: "Completed", className: "bg-purple-100 text-purple-900 border-purple-900" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 border-gray-700" },
  archived:  { label: "Archived",  className: "bg-zinc-100 text-zinc-600 border-zinc-600" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={cn("neo-pill", config.className, className)}>
      {config.label}
    </span>
  );
}
