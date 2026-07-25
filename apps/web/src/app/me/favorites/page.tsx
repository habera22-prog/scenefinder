"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { FavoriteItem } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function MyFavoritesPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<FavoriteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "찜한 작가를 불러오지 못했습니다."),
      );
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token, router]);

  async function unfavorite(photographerId: string) {
    try {
      await apiFetch(`/favorites/${photographerId}`, { method: "DELETE", token });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "찜 해제에 실패했습니다.");
    }
  }

  if (authLoading || items === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">찜한 작가</h1>
      {error && <p className="text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 찜한 작가가 없어요. 작가 프로필의 하트 아이콘으로 찜할 수 있어요.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((f) => (
            <Card key={f.id} className="flex items-center justify-between p-4">
              <a href={`/photographers/${f.photographer.id}`} className="flex-1">
                <p className="font-medium text-foreground">{f.photographer.businessName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {f.photographer.activeRegions.join(", ")}
                  {f.photographer.avgRating !== null &&
                    ` · ★ ${f.photographer.avgRating.toFixed(1)}`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.photographer.categories.slice(0, 3).map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              </a>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => unfavorite(f.photographer.id)}
              >
                찜 해제
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
