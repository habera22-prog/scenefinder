"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { rememberAuthReturn } from "@/lib/auth-return";
import { koreaToday } from "@/lib/discovery";
import type {
  CaptureMode,
  FavoriteItem,
  PhotographerSummary,
  ShootCategory,
} from "@/lib/types";
import { PhotographerCard } from "@/components/photographers/PhotographerCard";
import { Card } from "@/components/ui/Card";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Label } from "@/components/ui/Input";

function ResultsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const region = searchParams.get("region") ?? "";
  const captureMode = searchParams.get("captureMode") ?? "";
  const date = searchParams.get("date") ?? "";
  const sort = searchParams.get("sort") ?? "rating";
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<ShootCategory[]>([]);
  const [captureModes, setCaptureModes] = useState<CaptureMode[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: PhotographerSummary[];
    error: string | null;
  } | null>(null);
  const [favorites, setFavorites] = useState<{
    userId: string;
    ids: Set<string>;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({
    category,
    region,
    captureMode,
    date,
    sort,
  })) {
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  const resultKey = `${queryString}:${refresh}`;
  const photographers = result?.key === resultKey ? result.data : null;
  const error = result?.key === resultKey ? result.error : null;
  const favoriteIds =
    user && favorites?.userId === user.id ? favorites.ids : new Set<string>();

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<ShootCategory[]>("/shoot-categories"),
      apiFetch<CaptureMode[]>("/capture-modes"),
      apiFetch<string[]>("/photographers/regions"),
    ])
      .then(([c, m, r]) => {
        if (active) {
          setCategories(c);
          setCaptureModes(m);
          setRegions(r);
          setOptionsError(false);
        }
      })
      .catch(() => {
        if (active) setOptionsError(true);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    let active = true;
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then((data) => {
        if (active)
          setFavorites({
            userId: user.id,
            ids: new Set(data.map((f) => f.photographer.id)),
          });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, token]);

  useEffect(() => {
    let active = true;
    apiFetch<PhotographerSummary[]>(`/photographers?${queryString}`)
      .then((data) => {
        if (active) setResult({ key: resultKey, data, error: null });
      })
      .catch((err) => {
        if (active)
          setResult({
            key: resultKey,
            data: [],
            error:
              err instanceof ApiError
                ? err.message
                : "작가를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
          });
      });
    return () => {
      active = false;
    };
  }, [queryString, resultKey]);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`/photographers${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  async function toggleFavorite(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      rememberAuthReturn(`/photographers?${queryString}`);
      router.push("/login");
      return;
    }
    if (busyId) return;
    setBusyId(id);
    setFavoriteError(null);
    const exists = favoriteIds.has(id);
    try {
      await apiFetch(exists ? `/favorites/${id}` : "/favorites", {
        method: exists ? "DELETE" : "POST",
        token,
        ...(!exists ? { body: { photographerId: id } } : {}),
      });
      setFavorites((previous) => {
        const ids = new Set(previous?.userId === user.id ? previous.ids : []);
        if (exists) ids.delete(id);
        else ids.add(id);
        return { userId: user.id, ids };
      });
    } catch (err) {
      setFavoriteError(
        err instanceof ApiError
          ? err.message
          : "찜하기를 저장하지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setBusyId(null);
    }
  }
  const labels = Object.fromEntries(categories.map((c) => [c.code, c.label]));
  const filtered = Boolean(category || region || captureMode || date);
  const selectClass =
    "sf-input min-h-12 w-full min-w-0 rounded-xl px-3 py-3 text-sm";

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-9 pb-12">
      <p className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
        작품을 보고, 나에게 맞게
      </p>
      <h1 className="text-[26px] leading-snug font-bold">
        {category && labels[category]
          ? `${labels[category]} 촬영 작가 찾기`
          : "어떤 작가와 함께할까요?"}
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--muted-foreground)]">
        작품과 가격을 비교하고,
        <br className="sm:hidden" /> 마음에 드는 작가에게 문의하세요.
      </p>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="촬영 종류"
      >
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => updateParams({ category: "" })}
          className="sf-choice min-h-10 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.code}
            onClick={() =>
              updateParams({ category: category === c.code ? "" : c.code })
            }
            className="sf-choice min-h-10 rounded-xl px-4 py-2 text-sm font-medium"
          >
            {c.label}
          </button>
        ))}
      </div>
      <Card className="mt-5 space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="region">촬영 지역</Label>
            <select
              id="region"
              value={region}
              onChange={(e) => updateParams({ region: e.target.value })}
              className={selectClass}
            >
              <option value="">전체 지역</option>
              {region && !regions.includes(region) && (
                <option value={region}>{region}</option>
              )}
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="date">희망 날짜</Label>
            <Input
              id="date"
              aria-label="희망 날짜"
              type="date"
              min={koreaToday()}
              value={date}
              onChange={(e) => updateParams({ date: e.target.value })}
              className="min-h-12 px-3 py-3 text-sm"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="captureMode">촬영 방식</Label>
          <select
            id="captureMode"
            value={captureMode}
            onChange={(e) => updateParams({ captureMode: e.target.value })}
            className={selectClass}
          >
            <option value="">전체 방식 · 상담 후 결정</option>
            {captureModes.map((m) => (
              <option key={m.id} value={m.code}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {date && (
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            선택한 날짜가 휴무인 작가는 제외해요. 촬영 가능 시간은 문의로
            확인해주세요.
          </p>
        )}
        {optionsError && (
          <p className="text-sm text-[var(--danger)]">
            검색 조건을 불러오지 못했어요.{" "}
            <button
              type="button"
              onClick={() => setRefresh(refresh + 1)}
              className="sf-link font-semibold"
            >
              다시 불러오기
            </button>
          </p>
        )}
        {filtered && (
          <button
            type="button"
            onClick={() => router.replace("/photographers", { scroll: false })}
            className="sf-link inline-flex items-center gap-1 text-sm"
          >
            <Icon name="close" className="h-4 w-4" />
            조건 초기화
          </button>
        )}
      </Card>

      <div className="mt-7 mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" aria-live="polite">
          {photographers === null
            ? "작가를 찾고 있어요"
            : `작가 ${photographers.length}명`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="sr-only">
            작가 정렬
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="rounded-lg bg-transparent py-2 text-sm text-[var(--muted-foreground)]"
          >
            <option value="rating">평점 높은 순</option>
            <option value="price">시작 가격 낮은 순</option>
            <option value="newest">새로 등록한 순</option>
          </select>
        </div>
      </div>
      {favoriteError && (
        <p role="alert" className="mb-4 text-sm text-[var(--danger)]">
          {favoriteError}
        </p>
      )}
      {error ? (
        <Card className="p-6 text-center">
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => setRefresh(refresh + 1)}
          >
            다시 시도하기
          </Button>
        </Card>
      ) : photographers === null ? (
        <div
          className="grid gap-4 sm:grid-cols-2"
          role="status"
          aria-label="작가 목록 불러오는 중"
        >
          {[0, 1].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-2xl bg-[var(--card)]"
            />
          ))}
        </div>
      ) : photographers.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-muted)] text-[var(--brand-text)]">
            <Icon name="search" className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold">
            조건에 맞는 작가를 아직 못 찾았어요
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {filtered
              ? "지역이나 날짜 조건을 넓혀서 다시 찾아보세요."
              : "새로운 작가를 만나실 수 있도록 준비하고 있어요."}
          </p>
          {filtered && (
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() =>
                router.replace("/photographers", { scroll: false })
              }
            >
              전체 작가 보기
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {photographers.map((p) => (
            <PhotographerCard
              key={p.id}
              photographer={p}
              isFavorited={favoriteIds.has(p.id)}
              isBusy={busyId === p.id}
              onToggleFavorite={
                user?.role === "admin"
                  ? undefined
                  : (e) => toggleFavorite(p.id, e)
              }
              categoryLabels={labels}
              searchContext={queryString}
            />
          ))}
        </div>
      )}

      <Link
        href="/navigator"
        className={`${buttonStyles("secondary")} mt-7 w-full`}
      >
        <Icon name="sparkles" />
        촬영 종류부터 차근차근 찾기
      </Link>
    </div>
  );
}

export default function PhotographersPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-[var(--muted-foreground)]">
          작가 목록을 준비하고 있어요
        </p>
      }
    >
      <ResultsList />
    </Suspense>
  );
}
