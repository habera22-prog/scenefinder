"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "./api";
import { rememberAuthReturn } from "./auth-return";
import { useAuth } from "./auth-context";
import type { MyPhotographerProfile } from "./types";

export function usePhotographerProfile() {
  const auth = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    profile: MyPhotographerProfile | null;
    error: string | null;
  } | null>(null);
  const key = `${auth.user?.id}:${refresh}`;
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.user) {
      rememberAuthReturn(path);
      router.replace("/login");
      return;
    }
    if (auth.user.role !== "photographer") {
      router.replace("/");
      return;
    }
    let active = true;
    apiFetch<MyPhotographerProfile | null>("/photographers/me", {
      token: auth.token,
    })
      .then((profile) => {
        if (active) setResult({ key, profile, error: null });
      })
      .catch((error) => {
        if (active)
          setResult({
            key,
            profile: null,
            error:
              error instanceof ApiError
                ? error.message
                : "작가 정보를 불러오지 못했어요. 다시 시도해주세요.",
          });
      });
    return () => {
      active = false;
    };
  }, [auth.isLoading, auth.user, auth.token, key, path, router]);
  const current = result?.key === key ? result : null;
  return {
    ...auth,
    profile: current?.profile,
    error: current?.error ?? null,
    loading: auth.isLoading || !current,
    reload: () => setRefresh((value) => value + 1),
    setProfile: (
      next:
        | MyPhotographerProfile
        | ((previous: MyPhotographerProfile) => MyPhotographerProfile),
    ) =>
      setResult((previous) => {
        const profile =
          typeof next === "function"
            ? previous?.profile
              ? next(previous.profile)
              : null
            : next;
        return profile ? { key, profile, error: null } : previous;
      }),
  };
}
