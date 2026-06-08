"use client";

import { useSidebar } from "@/contexts/sidebar-context";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminTopbar({ title, subtitle, actions }: TopbarProps) {
  const { toggle } = useSidebar();

  return (
    <header className="bg-surface border-b-2 border-border px-4 lg:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button for mobile screens */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 neo-btn bg-surface hover:bg-neutral-100 font-bold text-lg h-9 w-9 flex items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
        >
          ☰
        </button>
        <div>
          <h2 className="text-lg lg:text-xl font-black tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs lg:text-sm text-muted-foreground font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 lg:gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
