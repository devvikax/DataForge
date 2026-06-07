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
        <div className="neo-card neo-shadow-sm text-center p-8">
          <div className="font-mono text-sm text-muted-foreground animate-pulse">Loading DataForge...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
