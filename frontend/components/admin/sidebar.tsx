"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/admin/forms", label: "Forms", icon: "📋", exact: false },
  { href: "/admin/submissions", label: "Submissions", icon: "📥", exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: "📊", exact: false },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
      />

      <aside
        id="admin-sidebar"
        className={cn(
          "w-64 min-h-screen bg-surface neo-border border-r-2 border-t-0 border-b-0 border-l-0 flex flex-col shrink-0",
          "transition-transform duration-300 ease-in-out z-50",
          "fixed lg:static top-0 bottom-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b-2 border-border flex items-center justify-between">
          <div>
            <div className="inline-block bg-accent neo-border px-2 py-0.5 mb-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Admin</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">DataForge</h1>
          </div>
          <button
            onClick={close}
            className="lg:hidden p-1.5 border-2 border-black hover:bg-neutral-100 h-8 w-8 flex items-center justify-center font-bold text-sm shrink-0"
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/admin";
          const isDashboard = item.exact && pathname === "/admin";

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 font-semibold text-sm transition-all duration-100",
                "neo-border",
                isActive || isDashboard
                  ? "bg-accent text-foreground -translate-x-0.5 -translate-y-0.5 shadow-[2px_2px_0px_#000000]"
                  : "bg-surface text-foreground hover:bg-accent/20 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#000000]"
              )}
            >
              <span className="text-base" role="img" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t-2 border-border">
        <div className="neo-card p-3 mb-2 shadow-none">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Signed in as</p>
          <p className="font-bold text-sm truncate">{user?.username}</p>
        </div>
        <button
          id="admin-logout-btn"
          onClick={logout}
          className="w-full neo-btn bg-surface text-foreground px-3 py-2 text-sm font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}
