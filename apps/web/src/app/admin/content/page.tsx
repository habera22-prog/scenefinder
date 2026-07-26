"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import { useAuth } from "@/lib/auth-context";
import type { AdminPhotographer, PhotographerProfile } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminContentPage() {
  const { token } = useAuth();
  const [photographers, setPhotographers] = useState<AdminPhotographer[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminPhotographer[]>("/admin/photographers", { token })
      .then(setPhotographers)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "작가 목록을 불러오지 못했습니다."),
      );
  }, [token]);

  function loadProfile(id: string) {
    setSelectedId(id);
    setProfile(null);
    apiFetch<PhotographerProfile>(`/photographers/${id}`)
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "프로필을 불러오지 못했습니다."),
      );
  }

  async function deletePortfolio(id: string) {
    if (!selectedId) return;
    setBusyId(id);
    try {
      await apiFetch(`/admin/portfolios/${id}`, { method: "DELETE", token });
      loadProfile(selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function deletePackage(id: string) {
    if (!selectedId) return;
    setBusyId(id);
    try {
      await apiFetch(`/admin/packages/${id}`, { method: "DELETE", token });
      loadProfile(selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (photographers === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
      <Card className="max-h-[600px] overflow-y-auto p-0">
        {photographers.map((p) => (
          <button
            key={p.id}
            onClick={() => loadProfile(p.id)}
            className={`block w-full border-b border-border px-4 py-3 text-left text-sm last:border-0 hover:bg-muted ${
              selectedId === p.id ? "bg-muted font-medium" : ""
            }`}
          >
            {p.businessName}
          </button>
        ))}
      </Card>

      <div>
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        {!selectedId ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            왼쪽에서 작가를 선택하세요.
          </p>
        ) : !profile ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-brand" />
          </div>
        ) : (
          <>
            <Card className="mb-4 p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                포트폴리오
              </h3>
              {profile.portfolios.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 포트폴리오가 없어요.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {profile.portfolios.map((p) => (
                    <div key={p.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(p.imageUrl)}
                        alt=""
                        className="aspect-square rounded-lg object-cover"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === p.id}
                        onClick={() => deletePortfolio(p.id)}
                        className="absolute right-1 top-1 h-7 px-2 text-xs"
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                촬영 패키지
              </h3>
              {profile.packages.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 상품이 없어요.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {profile.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{pkg.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.basePrice.toLocaleString()}원~
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === pkg.id}
                        onClick={() => deletePackage(pkg.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
