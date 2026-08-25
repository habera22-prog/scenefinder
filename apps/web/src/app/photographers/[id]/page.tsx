"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import { useAuth } from "@/lib/auth-context";
import type { FavoriteItem, PhotographerProfile, ShootCategory } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { FavoriteButton } from "@/components/photographers/FavoriteButton";

export default function PhotographerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const [showInquiry, setShowInquiry] = useState(false);
  const [allCategories, setAllCategories] = useState<ShootCategory[]>([]);
  const [shootCategoryId, setShootCategoryId] = useState("");
  const [shootDatetime, setShootDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [purpose, setPurpose] = useState("");
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    apiFetch<PhotographerProfile>(`/photographers/${params.id}`)
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "작가 정보를 불러오지 못했습니다."),
      );
    apiFetch<ShootCategory[]>("/shoot-categories").then(setAllCategories).catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (!user || user.role !== "customer") return;
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then((favorites) =>
        setIsFavorited(favorites.some((f) => f.photographer.id === params.id)),
      )
      .catch(() => {});
  }, [user, token, params.id]);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    setFavoriteBusy(true);
    try {
      if (isFavorited) {
        await apiFetch(`/favorites/${params.id}`, { method: "DELETE", token });
        setIsFavorited(false);
      } else {
        await apiFetch("/favorites", {
          method: "POST",
          token,
          body: { photographerId: params.id },
        });
        setIsFavorited(true);
      }
    } catch {
      // 낙관적 갱신 실패 시 조용히 무시 — 다음 방문 시 서버 상태로 재동기화
    } finally {
      setFavoriteBusy(false);
    }
  }

  const portfolioCategories = useMemo(() => {
    if (!profile) return [];
    const map = new Map<string, ShootCategory>();
    for (const p of profile.portfolios) {
      if (p.category) map.set(p.category.id, p.category);
    }
    return Array.from(map.values());
  }, [profile]);

  const filteredPortfolios = useMemo(() => {
    if (!profile) return [];
    if (activeCategory === "all") return profile.portfolios;
    return profile.portfolios.filter((p) => p.categoryId === activeCategory);
  }, [profile, activeCategory]);

  useEffect(() => {
    if (shootCategoryId || allCategories.length === 0) return;
    const preferred =
      portfolioCategories[0]?.id ??
      allCategories.find((c) => profile?.categories.includes(c.code))?.id ??
      allCategories[0].id;
    setShootCategoryId(preferred);
  }, [allCategories, portfolioCategories, profile, shootCategoryId]);

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setInquiryError(null);
    setIsSubmitting(true);
    try {
      const booking = await apiFetch<{ id: string }>("/bookings", {
        method: "POST",
        token,
        body: {
          photographerId: profile.id,
          shootCategoryId,
          shootDatetime: new Date(shootDatetime).toISOString(),
          location,
          headcount: Number(headcount),
          purpose,
        },
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setInquiryError(
        err instanceof ApiError ? err.message : "문의 요청에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) {
    return <p className="p-16 text-center text-danger">{error}</p>;
  }
  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">
          사진
        </div>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            {profile.businessName}
            <FavoriteButton
              isFavorited={isFavorited}
              isBusy={favoriteBusy}
              onToggle={toggleFavorite}
            />
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.activeRegions.join(", ")} 활동
            {profile.avgRating !== null && ` · ★ ${profile.avgRating.toFixed(1)}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.categories.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>
        </div>
      </div>

      <Card className="mt-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            포트폴리오
          </h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1 font-medium ${
              activeCategory === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            전체
          </button>
          {portfolioCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-full px-3 py-1 font-medium ${
                activeCategory === c.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {filteredPortfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 포트폴리오가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filteredPortfolios.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={resolveAssetUrl(p.imageUrl)}
                alt=""
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          촬영 패키지
        </h2>
        {profile.packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 상품이 없습니다.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.packages.map((pkg) => (
              <div key={pkg.id} className="rounded-xl border border-border p-4">
                <p className="font-semibold text-foreground">{pkg.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pkg.durationMin}분 · 보정 {pkg.includedPhotos}장+ ·{" "}
                  {pkg.rawIncluded ? "원본 제공" : "원본 미제공"}
                </p>
                <p className="mt-2 font-medium text-brand">
                  {pkg.basePrice.toLocaleString()}원~
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="sticky bottom-4 mt-8">
        {!showInquiry ? (
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (!user) {
                router.push("/login");
                return;
              }
              setShowInquiry(true);
            }}
          >
            이 작가에게 문의하기
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-foreground">촬영 문의하기</h3>
            <form className="flex flex-col gap-4" onSubmit={submitInquiry}>
              <div>
                <Label htmlFor="shootCategoryId">촬영 종류</Label>
                <select
                  id="shootCategoryId"
                  required
                  value={shootCategoryId}
                  onChange={(e) => setShootCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card p-2 text-sm focus:border-brand focus:outline-none"
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="shootDatetime">촬영 희망 일시</Label>
                <Input
                  id="shootDatetime"
                  type="datetime-local"
                  required
                  value={shootDatetime}
                  onChange={(e) => setShootDatetime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">장소</Label>
                <Input
                  id="location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                {location.trim().length > 0 &&
                  profile.activeRegions.length > 0 &&
                  !profile.activeRegions.some((r) => location.includes(r)) && (
                    <p className="mt-1 text-xs text-amber-600">
                      이 작가의 활동 지역({profile.activeRegions.join(", ")})과 다른 장소예요.
                      예약은 그대로 진행할 수 있지만, 출장비 등 추가 협의가 필요할 수 있어요.
                    </p>
                  )}
              </div>
              <div>
                <Label htmlFor="headcount">인원</Label>
                <Input
                  id="headcount"
                  type="number"
                  min={1}
                  required
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="purpose">사용 목적</Label>
                <Input
                  id="purpose"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              {inquiryError && <p className="text-sm text-danger">{inquiryError}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowInquiry(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "전송 중..." : "문의 보내기"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
