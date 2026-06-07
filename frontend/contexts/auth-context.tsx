"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
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
