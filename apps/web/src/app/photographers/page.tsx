"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { FavoriteItem, PhotographerSummary, ShootCategory } from "@/lib/types";
import { PhotographerCard } from "@/components/photographers/PhotographerCard";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

function ResultsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const region = searchParams.get("region") ?? "";
  const { user, token } = useAuth();

  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [regionInput, setRegionInput] = useState(region);
  const [photographers, setPhotographers] = useState<PhotographerSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<ShootCategory[]>("/shoot-categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || user.role !== "customer") return;
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then((favorites) => setFavoriteIds(new Set(favorites.map((f) => f.photographer.id))))
      .catch(() => {});
  }, [user, token]);

  async function toggleFavorite(photographerId: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    const isFavorited = favoriteIds.has(photographerId);
    try {
      if (isFavorited) {
        await apiFetch(`/favorites/${photographerId}`, { method: "DELETE", token });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(photographerId);
          return next;
        });
      } else {
        await apiFetch("/favorites", {
          method: "POST",
          token,
          body: { photographerId },
        });
        setFavoriteIds((prev) => new Set(prev).add(photographerId));
      }
    } catch {
      // 낙관적 갱신 실패 시 조용히 무시
    }
  }

  useEffect(() => {
    setPhotographers(null);
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (region) params.set("region", region);
    apiFetch<PhotographerSummary[]>(`/photographers?${params.toString()}`)
      .then(setPhotographers)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "작가 목록을 불러오지 못했습니다.",
        ),
      );
  }, [category, region]);

  function updateParams(next: { category?: string; region?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.category !== undefined) params.set("category", next.category);
    if (next.region !== undefined) {
      if (next.region) params.set("region", next.region);
      else params.delete("region");
    }
    router.push(`/photographers?${params.toString()}`);
  }

  const currentCategoryLabel = categories.find((c) => c.code === category)?.label;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">작가 추천 결과</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {currentCategoryLabel ? `${currentCategoryLabel} · ` : ""}
        최저가 순이 아닌 분야 적합도·분위기·일정·지역·후기 종합 스코어로 정렬됩니다.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => updateParams({ category: c.code })}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              category === c.code
                ? "border-brand bg-brand-muted text-brand"
                : "border-border bg-card text-foreground hover:border-brand/50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-xs">
        <Input
          placeholder="지역으로 좁혀보기 (예: 서울)"
          value={regionInput}
          onChange={(e) => setRegionInput(e.target.value)}
          onBlur={() => updateParams({ region: regionInput })}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ region: regionInput });
          }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!photographers && !error && (
          <Spinner className="h-6 w-6 text-brand" />
        )}
        {photographers?.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            조건에 맞는 작가를 아직 찾지 못했어요. 조건을 조금 넓혀보세요.
          </p>
        )}
        {photographers?.map((p) => (
          <PhotographerCard
            key={p.id}
            photographer={p}
            isFavorited={favoriteIds.has(p.id)}
            onToggleFavorite={(e) => toggleFavorite(p.id, e)}
          />
        ))}
      </div>
    </div>
  );
}

export default function PhotographersPage() {
  return (
    <Suspense>
      <ResultsList />
    </Suspense>
  );
}
