"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "./api";
import type { AuthUser } from "./types";

const STORAGE_KEY = "scenefinder.auth";

interface StoredAuth {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signup: (input: {
    role: "customer" | "photographer";
    name: string;
    email: string;
    phone: string;
  }) => Promise<{ userId: string; message: string }>;
  requestLoginOtp: (phone: string) => Promise<{ message: string }>;
  verifyOtp: (phone: string, code: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredAuth;
        setToken(parsed.token);
        setUser(parsed.user);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((next: StoredAuth | null) => {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setToken(next.token);
      setUser(next.user);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const signup = useCallback(
    (input: {
      role: "customer" | "photographer";
      name: string;
      email: string;
      phone: string;
    }) =>
      apiFetch<{ userId: string; message: string }>("/auth/signup", {
        method: "POST",
        body: input,
      }),
    [],
  );

  const requestLoginOtp = useCallback(
    (phone: string) =>
      apiFetch<{ message: string }>("/auth/login", {
        method: "POST",
        body: { phone },
      }),
    [],
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      const result = await apiFetch<{ accessToken: string; user: AuthUser }>(
        "/auth/phone-verify",
        { method: "POST", body: { phone, code } },
      );
      persist({ token: result.accessToken, user: result.user });
      return result.user;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({ token, user, isLoading, signup, requestLoginOtp, verifyOtp, logout }),
    [token, user, isLoading, signup, requestLoginOtp, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
