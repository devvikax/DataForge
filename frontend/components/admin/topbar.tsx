"use client";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminTopbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="bg-surface border-b-2 border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
