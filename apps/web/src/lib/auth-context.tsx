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

interface KakaoProfile {
  name: string;
  email: string | null;
  role: "customer" | "photographer" | null;
}

type KakaoCompleteResult =
  | { requiresSignup: true; ticket: string; profile: KakaoProfile }
  | { requiresSignup: false; user: AuthUser };

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  workspaceMode: "customer" | "photographer";
  setWorkspaceMode: (mode: "customer" | "photographer") => void;
  signup: (input: {
    role: "customer" | "photographer";
    name: string;
    email: string;
    phone: string;
  }) => Promise<{ userId: string; message: string }>;
  signupWithKakao: (input: {
    ticket: string;
    role: "customer" | "photographer";
    name: string;
    email: string;
    phone: string;
  }) => Promise<{ userId: string; message: string }>;
  startKakaoLogin: (
    preferredRole?: "customer" | "photographer",
  ) => Promise<string>;
  completeKakaoLogin: (ticket: string) => Promise<KakaoCompleteResult>;
  linkKakaoAccount: (ticket: string, accessToken: string) => Promise<void>;
  requestLoginOtp: (phone: string) => Promise<{ message: string }>;
  verifyOtp: (
    phone: string,
    code: string,
  ) => Promise<{ user: AuthUser; accessToken: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceMode, updateWorkspaceMode] = useState<
    "customer" | "photographer"
  >("customer");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredAuth;
          setToken(parsed.token);
          setUser(parsed.user);
          updateWorkspaceMode(
            parsed.user.role === "photographer" &&
              window.sessionStorage.getItem(
                `scenefinder.mode.${parsed.user.id}`,
              ) === "photographer"
              ? "photographer"
              : "customer",
          );
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: StoredAuth | null) => {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setToken(next.token);
      setUser(next.user);
      updateWorkspaceMode(
        next.user.role === "photographer" &&
          window.sessionStorage.getItem(`scenefinder.mode.${next.user.id}`) ===
            "photographer"
          ? "photographer"
          : "customer",
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUser(null);
      updateWorkspaceMode("customer");
    }
  }, []);

  const setWorkspaceMode = useCallback(
    (mode: "customer" | "photographer") => {
      if (user?.role !== "photographer") return;
      window.sessionStorage.setItem(`scenefinder.mode.${user.id}`, mode);
      updateWorkspaceMode(mode);
    },
    [user],
  );

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

  const signupWithKakao = useCallback(
    (input: {
      ticket: string;
      role: "customer" | "photographer";
      name: string;
      email: string;
      phone: string;
    }) =>
      apiFetch<{ userId: string; message: string }>("/auth/kakao/signup", {
        method: "POST",
        body: input,
      }),
    [],
  );

  const startKakaoLogin = useCallback(
    async (preferredRole?: "customer" | "photographer") => {
      const path = preferredRole
        ? `/auth/kakao?role=${encodeURIComponent(preferredRole)}`
        : "/auth/kakao";
      const result = await apiFetch<{ authorizationUrl: string }>(path);
      return result.authorizationUrl;
    },
    [],
  );

  const completeKakaoLogin = useCallback(
    async (ticket: string): Promise<KakaoCompleteResult> => {
      const result = await apiFetch<
        | {
            requiresSignup: true;
            ticket: string;
            profile: KakaoProfile;
          }
        | {
            requiresSignup: false;
            accessToken: string;
            user: AuthUser;
          }
      >("/auth/kakao/complete", { method: "POST", body: { ticket } });

      if (result.requiresSignup) return result;
      persist({ token: result.accessToken, user: result.user });
      return { requiresSignup: false, user: result.user };
    },
    [persist],
  );

  const linkKakaoAccount = useCallback(
    async (ticket: string, accessToken: string) => {
      await apiFetch("/auth/kakao/link", {
        method: "POST",
        token: accessToken,
        body: { ticket },
      });
    },
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
      return result;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      workspaceMode,
      setWorkspaceMode,
      signup,
      signupWithKakao,
      startKakaoLogin,
      completeKakaoLogin,
      linkKakaoAccount,
      requestLoginOtp,
      verifyOtp,
      logout,
    }),
    [
      token,
      user,
      isLoading,
      workspaceMode,
      setWorkspaceMode,
      signup,
      signupWithKakao,
      startKakaoLogin,
      completeKakaoLogin,
      linkKakaoAccount,
      requestLoginOtp,
      verifyOtp,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
