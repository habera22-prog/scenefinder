"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { useAuth } from "./auth-context";

export function useAuthenticatedResource<T>(path: string | null) {
  const { user, token, isLoading } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  } | null>(null);
  const key = `${user?.id}:${path}:${refresh}`;
  useEffect(() => {
    if (isLoading || !user || !path) return;
    let active = true;
    apiFetch<T>(path, { token })
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch((err) => {
        if (active)
          setResult({
            key,
            error:
              err instanceof ApiError
                ? err.message
                : "정보를 불러오지 못했어요. 다시 시도해주세요.",
          });
      });
    return () => {
      active = false;
    };
  }, [isLoading, user, token, path, key]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: Boolean(path && (!current || isLoading)),
    reload: () => setRefresh((n) => n + 1),
  };
}
