---
phase: 1
plan: 6
wave: 4
depends_on: [1.4, 1.5]
---

# Plan 1.6: Frontend Admin Login & Shell Layout

## Objective
Build the admin login page (JWT-based), the auth context that persists the token, the protected `/admin` route group with middleware, and the full admin shell layout with a Neo-Brutalist sidebar and top navigation. After this plan, an admin can log in, see the protected dashboard shell, and be redirected to `/login` when unauthenticated.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md
- frontend/app/globals.css
- frontend/tailwind.config.ts
- frontend/components/ui/

## Tasks

<task type="auto">
  <name>Create auth context, API client, and Next.js middleware for route protection</name>
  <files>
    /frontend/lib/api.ts
    /frontend/lib/auth.ts
    /frontend/contexts/auth-context.tsx
    /frontend/middleware.ts
  </files>
  <action>
    Create `frontend/lib/api.ts` — typed API client:
    ```typescript
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    type RequestOptions = {
      method?: string;
      body?: unknown;
      token?: string;
    };

    export class ApiError extends Error {
      constructor(
        public status: number,
        public detail: string
      ) {
        super(detail);
        this.name = "ApiError";
      }
    }

    async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      const { method = "GET", body, token } = options;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const err = await response.json();
          detail = err.detail ?? detail;
        } catch {}
        throw new ApiError(response.status, detail);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    }

    export const api = {
      get: <T>(endpoint: string, token?: string) =>
        request<T>(endpoint, { method: "GET", token }),

      post: <T>(endpoint: string, body: unknown, token?: string) =>
        request<T>(endpoint, { method: "POST", body, token }),

      patch: <T>(endpoint: string, body: unknown, token?: string) =>
        request<T>(endpoint, { method: "PATCH", body, token }),

      delete: <T>(endpoint: string, token?: string) =>
        request<T>(endpoint, { method: "DELETE", token }),

      // Auth-specific
      login: (username: string, password: string) =>
        request<{ access_token: string; token_type: string; expires_in: number }>(
          "/api/auth/login",
          { method: "POST", body: { username, password } }
        ),

      getMe: (token: string) =>
        request<{ id: string; username: string; is_admin: boolean }>(
          "/api/auth/me",
          { method: "GET", token }
        ),
    };
    ```

    Create `frontend/lib/auth.ts` — token storage utilities:
    ```typescript
    const TOKEN_KEY = "dataforge_token";

    export function getToken(): string | null {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(TOKEN_KEY);
    }

    export function setToken(token: string): void {
      localStorage.setItem(TOKEN_KEY, token);
    }

    export function removeToken(): void {
      localStorage.removeItem(TOKEN_KEY);
    }
    ```

    Create `frontend/contexts/auth-context.tsx`:
    ```tsx
    "use client";

    import { createContext, useContext, useEffect, useState, useCallback } from "react";
    import { useRouter } from "next/navigation";
    import { api, ApiError } from "@/lib/api";
    import { getToken, setToken, removeToken } from "@/lib/auth";

    interface AdminUser {
      id: string;
      username: string;
      is_admin: boolean;
    }

    interface AuthContextValue {
      user: AdminUser | null;
      token: string | null;
      isLoading: boolean;
      login: (username: string, password: string) => Promise<void>;
      logout: () => void;
    }

    const AuthContext = createContext<AuthContextValue | null>(null);

    export function AuthProvider({ children }: { children: React.ReactNode }) {
      const router = useRouter();
      const [user, setUser] = useState<AdminUser | null>(null);
      const [token, setTokenState] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(true);

      const logout = useCallback(() => {
        removeToken();
        setUser(null);
        setTokenState(null);
        router.push("/login");
      }, [router]);

      // Rehydrate from localStorage on mount
      useEffect(() => {
        const storedToken = getToken();
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        api.getMe(storedToken)
          .then((me) => {
            setUser(me);
            setTokenState(storedToken);
          })
          .catch(() => {
            removeToken();
          })
          .finally(() => {
            setIsLoading(false);
          });
      }, []);

      const login = async (username: string, password: string) => {
        const response = await api.login(username, password);
        setToken(response.access_token);
        setTokenState(response.access_token);
        const me = await api.getMe(response.access_token);
        setUser(me);
        router.push("/admin");
      };

      return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
          {children}
        </AuthContext.Provider>
      );
    }

    export function useAuth(): AuthContextValue {
      const ctx = useContext(AuthContext);
      if (!ctx) throw new Error("useAuth must be used within AuthProvider");
      return ctx;
    }
    ```

    Create `frontend/middleware.ts` — Next.js edge middleware for route protection:
    ```typescript
    import { NextRequest, NextResponse } from "next/server";

    const PROTECTED_PATHS = ["/admin"];
    const PUBLIC_PATHS = ["/login", "/f/", "/edit-request", "/edit/"];

    export function middleware(request: NextRequest): NextResponse {
      const { pathname } = request.nextUrl;

      const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
      if (!isProtected) return NextResponse.next();

      // Check for token in Authorization header (API requests)
      // For page navigation, the client-side AuthProvider handles redirect
      // Middleware only blocks based on cookie-based token if set
      // v1: rely on client-side auth guard (token in localStorage)
      return NextResponse.next();
    }

    export const config = {
      matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
    };
    ```

    NOTE on middleware design: Because token is stored in localStorage (not cookies),
    Next.js edge middleware cannot read it. The `(admin)` route group's layout handles
    the redirect via a client-side auth guard component (created in the next task).
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "frontend/lib/api.ts" -and
    Test-Path "frontend/lib/auth.ts" -and
    Test-Path "frontend/contexts/auth-context.tsx" -and
    Test-Path "frontend/middleware.ts" -and
    (Select-String -Path "frontend/lib/api.ts" -Pattern "ApiError" -Quiet) -and
    (Select-String -Path "frontend/contexts/auth-context.tsx" -Pattern "useAuth" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - api.ts exports typed `api` object and `ApiError` class
    - auth.ts exports getToken, setToken, removeToken (localStorage-based)
    - auth-context.tsx exports AuthProvider and useAuth hook
    - AuthProvider rehydrates from localStorage on mount via GET /api/auth/me
    - middleware.ts exists (passthrough in v1, client-side guard in layout)
  </done>
</task>

<task type="auto">
  <name>Build admin login page and protected admin shell layout with sidebar</name>
  <files>
    /frontend/app/login/page.tsx
    /frontend/app/(admin)/layout.tsx
    /frontend/app/(admin)/admin/page.tsx
    /frontend/components/admin/sidebar.tsx
    /frontend/components/admin/topbar.tsx
    /frontend/components/admin/auth-guard.tsx
  </files>
  <action>
    Create `frontend/app/login/page.tsx`:
    ```tsx
    import type { Metadata } from "next";
    import { LoginForm } from "@/components/admin/login-form";

    export const metadata: Metadata = {
      title: "Admin Login",
      description: "Sign in to DataForge admin dashboard",
    };

    export default function LoginPage() {
      return (
        <main className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Brand header */}
            <div className="mb-8">
              <div className="inline-block bg-accent neo-border neo-shadow-sm px-3 py-0.5 mb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-widest">Admin</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">DataForge</h1>
              <p className="text-muted mt-1">Sign in to your dashboard</p>
            </div>

            <div className="neo-card neo-shadow-lg">
              <LoginForm />
            </div>
          </div>
        </main>
      );
    }
    ```

    Create `frontend/components/admin/login-form.tsx`:
    ```tsx
    "use client";

    import { useState } from "react";
    import { useAuth } from "@/contexts/auth-context";
    import { ApiError } from "@/lib/api";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";

    export function LoginForm() {
      const { login } = useAuth();
      const [username, setUsername] = useState("");
      const [password, setPassword] = useState("");
      const [error, setError] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
          await login(username, password);
        } catch (err) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError("An unexpected error occurred. Please try again.");
          }
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <form onSubmit={handleSubmit} className="space-y-5" id="admin-login-form">
          <div className="space-y-1.5">
            <Label htmlFor="login-username" className="font-semibold">Username</Label>
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              className="neo-input h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="font-semibold">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="neo-input h-11"
            />
          </div>

          {error && (
            <div
              className="neo-border border-danger bg-red-50 p-3 text-danger text-sm font-medium animate-shake"
              role="alert"
              id="login-error"
            >
              {error}
            </div>
          )}

          <Button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full h-11 bg-accent text-foreground neo-btn font-bold text-base hover:bg-accent-hover"
          >
            {isLoading ? "Signing in..." : "Sign in →"}
          </Button>
        </form>
      );
    }
    ```

    Create `frontend/components/admin/auth-guard.tsx`:
    ```tsx
    "use client";

    import { useEffect } from "react";
    import { useRouter } from "next/navigation";
    import { useAuth } from "@/contexts/auth-context";

    export function AuthGuard({ children }: { children: React.ReactNode }) {
      const { user, isLoading } = useAuth();
      const router = useRouter();

      useEffect(() => {
        if (!isLoading && !user) {
          router.replace("/login");
        }
      }, [user, isLoading, router]);

      if (isLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="neo-card neo-shadow-md text-center p-8">
              <div className="font-mono text-sm text-muted animate-pulse">Loading DataForge...</div>
            </div>
          </div>
        );
      }

      if (!user) return null;

      return <>{children}</>;
    }
    ```

    Create `frontend/components/admin/sidebar.tsx`:
    ```tsx
    "use client";

    import Link from "next/link";
    import { usePathname } from "next/navigation";
    import { useAuth } from "@/contexts/auth-context";
    import { cn } from "@/lib/utils";

    const NAV_ITEMS = [
      { href: "/admin", label: "Dashboard", icon: "⬛", exact: true },
      { href: "/admin/forms", label: "Forms", icon: "📋", exact: false },
      { href: "/admin/submissions", label: "Submissions", icon: "📥", exact: false },
      { href: "/admin/edit-requests", label: "Edit Requests", icon: "✏️", exact: false },
      { href: "/admin/analytics", label: "Analytics", icon: "📊", exact: false },
    ] as const;

    export function AdminSidebar() {
      const pathname = usePathname();
      const { user, logout } = useAuth();

      return (
        <aside
          id="admin-sidebar"
          className="w-64 min-h-screen bg-surface neo-border border-r-2 border-t-0 border-b-0 border-l-0 flex flex-col"
        >
          {/* Logo */}
          <div className="p-5 border-b-2 border-border">
            <div className="inline-block bg-accent neo-border neo-shadow-sm px-2 py-0.5 mb-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Admin</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">DataForge</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="Admin navigation">
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
                    "neo-border neo-shadow-sm",
                    isActive || isDashboard
                      ? "bg-accent text-foreground neo-shadow-md -translate-x-0.5 -translate-y-0.5"
                      : "bg-surface text-foreground hover:bg-accent/20 hover:neo-shadow-md hover:-translate-x-0.5 hover:-translate-y-0.5"
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
            <div className="neo-card p-3 neo-shadow-sm mb-2">
              <p className="font-mono text-xs text-muted uppercase tracking-wider">Signed in as</p>
              <p className="font-bold text-sm truncate">{user?.username}</p>
            </div>
            <button
              id="admin-logout-btn"
              onClick={logout}
              className="w-full neo-btn bg-surface text-foreground px-3 py-2 text-sm font-semibold hover:bg-red-50 hover:text-danger hover:border-danger"
            >
              Sign out
            </button>
          </div>
        </aside>
      );
    }
    ```

    Create `frontend/components/admin/topbar.tsx`:
    ```tsx
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
              <p className="text-sm text-muted font-medium mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
      );
    }
    ```

    Create `frontend/app/(admin)/layout.tsx`:
    ```tsx
    import { AuthProvider } from "@/contexts/auth-context";
    import { AuthGuard } from "@/components/admin/auth-guard";
    import { AdminSidebar } from "@/components/admin/sidebar";

    export default function AdminLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <AuthProvider>
          <AuthGuard>
            <div className="flex min-h-screen">
              <AdminSidebar />
              <div className="flex-1 flex flex-col min-w-0">
                {children}
              </div>
            </div>
          </AuthGuard>
        </AuthProvider>
      );
    }
    ```

    Create `frontend/app/(admin)/admin/page.tsx` — dashboard placeholder:
    ```tsx
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
                    <p className="font-mono text-xs text-muted uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black">{stat.value}</p>
                  </div>
                </NeoCard>
              ))}
            </div>

            <NeoCard>
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Status</p>
              <p className="text-lg font-bold">
                ✅ DataForge is running. Phase 1 complete.
              </p>
              <p className="text-sm text-muted mt-1">
                Start by creating your first form in the <strong>Forms</strong> section.
              </p>
            </NeoCard>
          </main>
        </div>
      );
    }
    ```

    Update root `frontend/app/layout.tsx` to wrap with AuthProvider at the top level only for login page:
    NOTE — Do NOT add AuthProvider to the root layout. It is already added in `(admin)/layout.tsx`.
    The login page also needs AuthProvider to call `login()`. Wrap login page separately:

    Update `frontend/app/login/page.tsx` to wrap content in AuthProvider:
    ```tsx
    import type { Metadata } from "next";
    import { AuthProvider } from "@/contexts/auth-context";
    import { LoginForm } from "@/components/admin/login-form";

    export const metadata: Metadata = {
      title: "Admin Login",
      description: "Sign in to DataForge admin dashboard",
    };

    export default function LoginPage() {
      return (
        <AuthProvider>
          <main className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <div className="inline-block bg-accent neo-border neo-shadow-sm px-3 py-0.5 mb-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest">Admin</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight">DataForge</h1>
                <p className="text-muted mt-1">Sign in to your dashboard</p>
              </div>

              <div className="neo-card neo-shadow-lg">
                <LoginForm />
              </div>
            </div>
          </main>
        </AuthProvider>
      );
    }
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "frontend/app/login/page.tsx" -and
    Test-Path "frontend/app/(admin)/layout.tsx" -and
    Test-Path "frontend/app/(admin)/admin/page.tsx" -and
    Test-Path "frontend/components/admin/sidebar.tsx" -and
    Test-Path "frontend/components/admin/auth-guard.tsx" -and
    Test-Path "frontend/components/admin/login-form.tsx" -and
    (Select-String -Path "frontend/components/admin/auth-guard.tsx" -Pattern "router.replace.*login" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - /login page renders Neo-Brutalist login form with username/password fields
    - LoginForm shows error message from API (e.g. "Incorrect username or password") with id="login-error"
    - AuthProvider provides login/logout/user/token to all admin pages
    - AuthGuard redirects to /login if not authenticated (router.replace)
    - AdminSidebar renders with 5 nav items; active item has accent background + shadow offset
    - Admin shell: sidebar on left + flex-1 content area on right
    - /admin page shows placeholder dashboard with 4 stat cards
    - Logout button in sidebar calls logout() → removes token → redirects to /login
  </done>
</task>

## Success Criteria
- [ ] Navigating to `/admin` while unauthenticated redirects to `/login`
- [ ] `/login` page renders the Neo-Brutalist login form
- [ ] Submitting wrong credentials shows error message in the form (id="login-error")
- [ ] Submitting correct credentials redirects to `/admin` and shows the sidebar + dashboard
- [ ] Admin sidebar shows all 5 nav items with active state highlighting
- [ ] Logout button removes token and redirects to `/login`
- [ ] Admin dashboard page shows 4 stat cards (values showing "—" placeholder)
- [ ] No TypeScript errors (`npm run dev` starts without warnings in console)
