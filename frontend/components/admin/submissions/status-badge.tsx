"use client";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  Pending: {
    label: "Pending",
    bg: "bg-yellow-100",
    text: "text-yellow-900",
    border: "border-yellow-900",
  },
  Verified: {
    label: "Verified",
    bg: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-900",
  },
  Approved: {
    label: "Approved",
    bg: "bg-green-100",
    text: "text-green-900",
    border: "border-green-900",
  },
  Rejected: {
    label: "Rejected",
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-900",
  },
  Completed: {
    label: "Completed",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-900",
  },
  Cancelled: {
    label: "Cancelled",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-500",
  },
  Archived: {
    label: "Archived",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-500",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-500",
  };

  return (
    <span
      className={`neo-pill inline-block ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
}

export const ALL_STATUSES = Object.keys(STATUS_CONFIG);
