"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { rememberAuthReturn } from "@/lib/auth-return";
import { useAuth } from "@/lib/auth-context";
import type { FavoriteItem, ShootCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PhotographerCard } from "@/components/photographers/PhotographerCard";

export default function MyFavoritesPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<{
    userId: string;
    items: FavoriteItem[];
    error: string | null;
  } | null>(null);
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      rememberAuthReturn("/me/favorites");
      router.replace("/login");
      return;
    }
    let active = true;
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then((items) => {
        if (active) setResult({ userId: user.id, items, error: null });
      })
      .catch((err) => {
        if (active)
          setResult({
            userId: user.id,
            items: [],
            error:
              err instanceof ApiError
                ? err.message
                : "찜한 작가를 불러오지 못했어요.",
          });
      });
    apiFetch<ShootCategory[]>("/shoot-categories")
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isLoading, user, token, router, refresh]);

  async function unfavorite(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      await apiFetch(`/favorites/${id}`, { method: "DELETE", token });
      setResult((previous) =>
        previous
          ? {
              ...previous,
              items: previous.items.filter(
                (item) => item.photographer.id !== id,
              ),
            }
          : null,
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "찜 해제에 실패했어요. 다시 시도해주세요.",
      );
    } finally {
      setBusyId(null);
    }
  }
  const loaded = user && result?.userId === user.id ? result : null;
  const labels = Object.fromEntries(categories.map((c) => [c.code, c.label]));
  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-9 pb-12 lg:max-w-[1200px] lg:px-8 lg:pt-12">
      <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
        마음에 드는 작품을 모아두세요
      </p>
      <h1 className="text-[26px] font-bold">찜한 작가</h1>
      <p className="mt-3 text-[17px] text-[var(--muted-foreground)]">
        다시 보고, 비교하고, 편하게 문의하세요.
      </p>
      {actionError && (
        <p role="alert" className="mt-5 text-sm text-[var(--danger)]">
          {actionError}
        </p>
      )}
      <div className="mt-6">
        {!loaded ? (
          <div
            role="status"
            aria-label="찜한 작가를 불러오는 중"
            className="h-72 animate-pulse rounded-2xl bg-[var(--card)]"
          />
        ) : loaded.error ? (
          <Card className="p-6">
            <p role="alert" className="text-sm text-[var(--danger)]">
              {loaded.error}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => setRefresh(refresh + 1)}
            >
              다시 불러오기
            </Button>
          </Card>
        ) : loaded.items.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon
              name="heart"
              className="mx-auto mb-4 h-10 w-10 text-[var(--brand-text)]"
            />
            <h2 className="text-lg font-bold">
              마음에 드는 작가를 찾아볼까요?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              작가 카드의 하트를 누르면
              <br />
              여기에서 다시 볼 수 있어요.
            </p>
            <Link
              href="/photographers"
              className={`${buttonStyles("primary")} mt-6 w-full`}
            >
              작가 둘러보기
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {loaded.items.map((item) => (
              <PhotographerCard
                key={item.id}
                photographer={item.photographer}
                categoryLabels={labels}
                isFavorited
                isBusy={busyId === item.photographer.id}
                onToggleFavorite={(e) => unfavorite(item.photographer.id, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
