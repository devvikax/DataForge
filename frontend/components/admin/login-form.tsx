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
          className="neo-border border-destructive bg-destructive/10 p-3 text-destructive text-sm font-medium animate-shake"
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
