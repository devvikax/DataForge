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
            <div className="inline-block bg-accent neo-border px-3 py-0.5 mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest">Admin</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">DataForge</h1>
            <p className="text-muted-foreground mt-1">Sign in to your dashboard</p>
          </div>

          <div className="neo-card">
            <LoginForm />
          </div>
        </div>
      </main>
    </AuthProvider>
  );
}
