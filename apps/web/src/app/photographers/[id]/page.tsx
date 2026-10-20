"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset";
import { rememberAuthReturn } from "@/lib/auth-return";
import { useAuth } from "@/lib/auth-context";
import {
  formatShootDate,
  koreaToday,
  photographerName,
  supportsCaptureMode,
} from "@/lib/discovery";
import type {
  CaptureMode,
  FavoriteItem,
  PackageItem,
  PhotographerProfile,
  PhotographerReview,
  PhotographerUnavailableDate,
  Portfolio,
  ShootCategory,
} from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { FavoriteButton } from "@/components/photographers/FavoriteButton";

interface InquiryDraft {
  photographerId: string;
  categoryId: string;
  packageId: string;
  captureModeId: string;
  date: string;
  time: string;
  location: string;
  headcount: string;
  purpose: string;
}
interface ProfileResources {
  id: string;
  profile: PhotographerProfile;
  categories: ShootCategory[];
  modes: CaptureMode[];
  unavailable: PhotographerUnavailableDate[];
  reviews: PhotographerReview[];
  availabilityError: boolean;
  reviewsError: boolean;
}
const emptyDraft: InquiryDraft = {
  photographerId: "",
  categoryId: "",
  packageId: "",
  captureModeId: "",
  date: "",
  time: "10:00",
  location: "",
  headcount: "1",
  purpose: "",
};
const selectClass =
  "sf-input min-h-13 w-full min-w-0 rounded-xl px-4 py-3.5 text-base";

function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const [resources, setResources] = useState<ProfileResources | null>(null);
  const [failure, setFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showInquiry, setShowInquiry] = useState(
    searchParams.get("inquiry") === "1",
  );
  const [draft, setDraft] = useState<InquiryDraft>(emptyDraft);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [favorite, setFavorite] = useState<{
    userId: string;
    photographerId: string;
    value: boolean;
  } | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Portfolio | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const profile = resources?.id === id ? resources.profile : null;
  const error = failure?.id === id ? failure.message : null;
  const contextCategory = searchParams.get("category") || "";
  const contextRegion = searchParams.get("region") || "";
  const contextDate = searchParams.get("date") || "";
  const contextMode = searchParams.get("captureMode") || "";
  const isFavorited = Boolean(
    user &&
    favorite?.userId === user.id &&
    favorite.photographerId === id &&
    favorite.value,
  );

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch<PhotographerProfile>(`/photographers/${id}`),
      apiFetch<ShootCategory[]>("/shoot-categories"),
      apiFetch<CaptureMode[]>("/capture-modes"),
      apiFetch<PhotographerUnavailableDate[]>(
        `/photographers/${id}/availability`,
      ),
      apiFetch<PhotographerReview[]>(`/photographers/${id}/reviews`),
    ]).then(([p, c, m, a, r]) => {
      if (!active) return;
      if (p.status === "rejected") {
        setFailure({
          id,
          message:
            p.reason instanceof ApiError
              ? p.reason.message
              : "작가 정보를 불러오지 못했어요.",
        });
        return;
      }
      const categories = c.status === "fulfilled" ? c.value : [];
      const modes = m.status === "fulfilled" ? m.value : [];
      const available = categories.filter(
        (category) =>
          p.value.categories.includes(category.code) &&
          (!category.businessOnly || p.value.photographerType === "business"),
      );
      setResources({
        id,
        profile: p.value,
        categories,
        modes,
        unavailable: a.status === "fulfilled" ? a.value : [],
        reviews: r.status === "fulfilled" ? r.value : [],
        availabilityError: a.status === "rejected",
        reviewsError: r.status === "rejected",
      });
      setFailure(null);
      setDraft((previous) => {
        if (previous.photographerId === id) return previous;
        const initial: InquiryDraft = {
          ...emptyDraft,
          photographerId: id,
          categoryId:
            (
              available.find((category) => category.code === contextCategory) ??
              available[0]
            )?.id || "",
          captureModeId:
            modes.find(
              (mode) =>
                mode.code === contextMode &&
                supportsCaptureMode(
                  p.value.captureCapabilities || [],
                  mode.code,
                ),
            )?.id || "",
          date:
            /^\d{4}-\d{2}-\d{2}$/.test(contextDate) &&
            contextDate >= koreaToday()
              ? contextDate
              : "",
          location: contextRegion,
        };
        try {
          const stored: unknown = JSON.parse(
            window.sessionStorage.getItem(`scenefinder.inquiry.${id}`) ||
              "null",
          );
          if (stored && typeof stored === "object") {
            for (const key of [
              "date",
              "time",
              "location",
              "headcount",
              "purpose",
            ] as const) {
              if (
                key in stored &&
                typeof (stored as Record<string, unknown>)[key] === "string"
              )
                initial[key] = (stored as Record<string, string>)[key];
            }
            const saved = stored as Record<string, unknown>;
            if (available.some((category) => category.id === saved.categoryId))
              initial.categoryId = String(saved.categoryId);
            if (p.value.packages.some((pkg) => pkg.id === saved.packageId))
              initial.packageId = String(saved.packageId);
            if (
              modes.some(
                (mode) =>
                  mode.id === saved.captureModeId &&
                  supportsCaptureMode(
                    p.value.captureCapabilities || [],
                    mode.code,
                  ),
              )
            )
              initial.captureModeId = String(saved.captureModeId);
          }
        } catch {
          /* 만료된 초안은 새 문의로 시작 */
        }
        return initial;
      });
    });
    return () => {
      active = false;
    };
  }, [id, contextCategory, contextRegion, contextDate, contextMode, refresh]);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    let active = true;
    apiFetch<FavoriteItem[]>("/customers/me/favorites", { token })
      .then((data) => {
        if (active)
          setFavorite({
            userId: user.id,
            photographerId: id,
            value: data.some((f) => f.photographer.id === id),
          });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, token, id]);

  useEffect(() => {
    if (showInquiry && profile)
      document.getElementById("inquiry")?.scrollIntoView({ block: "start" });
  }, [showInquiry, profile]);

  function changeDraft(next: Partial<InquiryDraft>) {
    setDraft((previous) => ({ ...previous, ...next }));
  }
  function choosePackage(pkg: PackageItem) {
    const category = resources?.categories.find((c) => c.code === pkg.category);
    const mode = resources?.modes.find((m) => m.code === pkg.captureModeCode);
    changeDraft({
      packageId: pkg.id,
      ...(category ? { categoryId: category.id } : {}),
      captureModeId: mode?.id || "",
    });
    setShowInquiry(true);
  }
  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      rememberAuthReturn(`/photographers/${id}?${searchParams}`);
      router.push("/login");
      return;
    }
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setFavoriteError(null);
    try {
      await apiFetch(isFavorited ? `/favorites/${id}` : "/favorites", {
        method: isFavorited ? "DELETE" : "POST",
        token,
        ...(!isFavorited ? { body: { photographerId: id } } : {}),
      });
      setFavorite({ userId: user.id, photographerId: id, value: !isFavorited });
    } catch (err) {
      setFavoriteError(
        err instanceof ApiError ? err.message : "찜하기를 저장하지 못했어요.",
      );
    } finally {
      setFavoriteBusy(false);
    }
  }
  const unavailable = resources?.id === id ? resources.unavailable : [];
  const blocked = Boolean(
    draft.date &&
    unavailable.some((day) => day.date.slice(0, 10) === draft.date),
  );
  const availableCategories = (resources?.categories || []).filter(
    (c) =>
      profile?.categories.includes(c.code) &&
      (!c.businessOnly || profile.photographerType === "business"),
  );
  const supportedModes = (resources?.modes || []).filter((m) =>
    supportsCaptureMode(profile?.captureCapabilities || [], m.code),
  );

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || isSubmitting) return;
    setInquiryError(null);
    if (blocked) {
      setInquiryError("작가의 휴무일이에요. 다른 날짜를 선택해주세요.");
      return;
    }
    const datetime = new Date(`${draft.date}T${draft.time}:00+09:00`);
    if (!Number.isFinite(datetime.getTime()) || datetime <= new Date()) {
      setInquiryError("앞으로 촬영하고 싶은 날짜와 시간을 선택해주세요.");
      return;
    }
    if (!availableCategories.some((c) => c.id === draft.categoryId)) {
      setInquiryError("이 작가가 촬영하는 분야를 선택해주세요.");
      return;
    }
    if (!user) {
      window.sessionStorage.setItem(
        `scenefinder.inquiry.${id}`,
        JSON.stringify(draft),
      );
      const next = new URLSearchParams(searchParams.toString());
      next.set("inquiry", "1");
      rememberAuthReturn(`/photographers/${id}?${next}#inquiry`);
      router.push("/login");
      return;
    }
    setIsSubmitting(true);
    try {
      const booking = await apiFetch<{ id: string }>("/bookings", {
        method: "POST",
        token,
        body: {
          photographerId: id,
          shootCategoryId: draft.categoryId,
          ...(draft.packageId ? { packageId: draft.packageId } : {}),
          ...(draft.captureModeId
            ? { captureModeId: draft.captureModeId }
            : {}),
          shootDatetime: datetime.toISOString(),
          location: draft.location.trim(),
          headcount: Number(draft.headcount),
          purpose: draft.purpose.trim(),
        },
      });
      window.sessionStorage.removeItem(`scenefinder.inquiry.${id}`);
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setInquiryError(
        err instanceof ApiError
          ? err.message
          : "문의를 보내지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error)
    return (
      <div className="mx-auto w-full max-w-[640px] px-5 py-16 text-center">
        <Card className="p-6">
          <p role="alert" className="text-[var(--danger)]">
            {error}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setRefresh(refresh + 1)}
          >
            다시 불러오기
          </Button>
          <Link href="/photographers" className="sf-link mt-5 block text-sm">
            다른 작가 둘러보기
          </Link>
        </Card>
      </div>
    );
  if (!profile || !resources)
    return (
      <div className="flex justify-center py-24" role="status">
        <Spinner className="h-8 w-8 text-[var(--brand)]" />
        <span className="sr-only">작가 프로필을 불러오고 있어요</span>
      </div>
    );

  const name = photographerName({
    ...profile,
    displayName: profile.displayName || profile.user?.name,
  });
  const labels = Object.fromEntries(
    resources.categories.map((c) => [c.code, c.label]),
  );
  const portfolioCategories = resources.categories.filter((c) =>
    profile.portfolios.some((p) => p.categoryId === c.id),
  );
  const photos =
    activeCategory === "all"
      ? profile.portfolios
      : profile.portfolios.filter((p) => p.categoryId === activeCategory);
  const minimumPrice = profile.packages.length
    ? Math.min(...profile.packages.map((pkg) => pkg.basePrice))
    : null;
  const selectedPackage = profile.packages.find(
    (pkg) => pkg.id === draft.packageId,
  );
  const backParams = new URLSearchParams(searchParams.toString());
  backParams.delete("inquiry");
  const canInquire = profile.verificationStatus === "verified";

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-9 pb-32">
      <Link
        href={`/photographers${backParams.size ? `?${backParams}` : ""}`}
        className="sf-tab mb-7 inline-flex items-center gap-1 text-sm"
      >
        <Icon name="back" className="h-4 w-4" />
        작가 목록으로
      </Link>
      <header>
        <div className="mb-3 flex gap-2">
          {canInquire && (
            <Badge>
              <Icon name="shield" className="h-3.5 w-3.5" />
              심사 완료
            </Badge>
          )}
          <Badge>
            {profile.photographerType === "business"
              ? "사업자 작가"
              : "프리랜서 작가"}
          </Badge>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-[26px] leading-snug font-bold">
            {name}
          </h1>
          {user?.role !== "admin" && (
            <FavoriteButton
              isFavorited={isFavorited}
              isBusy={favoriteBusy}
              onToggle={toggleFavorite}
              className="bg-[var(--card)]"
            />
          )}
        </div>
        <p className="mt-2 text-[17px] text-[var(--muted-foreground)]">
          {profile.categories.map((c) => labels[c] || c).join(" · ")}
        </p>
        <p className="mt-3 flex items-start gap-1.5 text-sm text-[var(--muted-foreground)]">
          <Icon name="pin" className="h-4 w-4 shrink-0" />
          {profile.activeRegions.join(" · ") || "촬영 지역은 문의해주세요"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {profile.avgRating !== null ? (
            <a href="#reviews" className="sf-link flex items-center gap-1">
              <Icon name="star" className="h-4 w-4 fill-current" />
              <strong>{Number(profile.avgRating).toFixed(1)}</strong>
              <span className="text-[var(--muted-foreground)]">
                후기 {profile.reviewCount ?? resources.reviews.length}개
              </span>
            </a>
          ) : (
            <span className="text-[var(--muted-foreground)]">
              첫 후기를 기다리고 있어요
            </span>
          )}
          <span className="text-[var(--muted-foreground)]">
            촬영 완료 {profile.completedBookingsCount}건
          </span>
        </div>
        {profile.moodTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.moodTags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-[var(--muted-foreground)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {favoriteError && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            {favoriteError}
          </p>
        )}
      </header>

      <nav aria-label="프로필 내용" className="my-6 grid grid-cols-4 gap-2">
        {[
          { href: "#portfolio", label: "작품" },
          { href: "#packages", label: "촬영 상품" },
          { href: "#schedule", label: "일정" },
          { href: "#reviews", label: "후기" },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className="sf-button-ghost rounded-xl bg-[var(--card)] py-3 text-center text-sm font-semibold"
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <section id="portfolio" className="scroll-mt-20">
        <h2 className="text-xl font-bold">이런 순간을 담아요</h2>
        {portfolioCategories.length > 1 && (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="작품 촬영 분야"
          >
            <button
              type="button"
              aria-pressed={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className="sf-choice rounded-xl px-3 py-2 text-sm"
            >
              전체
            </button>
            {portfolioCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
                className="sf-choice rounded-xl px-3 py-2 text-sm"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {photos.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-[var(--muted-foreground)]">
            작가가 작품을 준비하고 있어요.
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {photos.map((p, index) => (
              <button
                type="button"
                key={p.id}
                aria-label={`${name} 작품 ${index + 1} 크게 보기`}
                onClick={() => {
                  setSelectedPhoto(p);
                  photoDialog.current?.showModal();
                }}
                className="sf-card-hover overflow-hidden rounded-2xl bg-[var(--muted)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(p.imageUrl)}
                  alt={`${p.category?.label || "촬영"} 포트폴리오 ${index + 1}`}
                  className="aspect-[4/5] w-full object-cover"
                  loading={index < 2 ? "eager" : "lazy"}
                />
              </button>
            ))}
          </div>
        )}
        {photos.length > 0 && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            사진을 누르면 크게 볼 수 있어요
          </p>
        )}
      </section>

      <section id="packages" className="mt-9 scroll-mt-20">
        <h2 className="text-xl font-bold">촬영 상품과 기본 가격</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          포함 내용을 확인해보세요. 최종 금액은 촬영 조건을 상담한 뒤 정해져요.
        </p>
        <div className="mt-4 space-y-3">
          {profile.packages.length === 0 ? (
            <Card className="p-5">
              <p className="font-semibold">
                원하는 촬영에 맞춰 견적을 받아보세요
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                날짜, 장소, 원하는 사진을 알려주시면 작가가 견적을 보내드려요.
              </p>
            </Card>
          ) : (
            profile.packages.map((pkg) => (
              <Card key={pkg.id} className="p-5">
                <Badge>{labels[pkg.category] || pkg.category}</Badge>
                <h3 className="mt-3 text-lg font-bold">{pkg.title}</h3>
                <p className="mt-2 text-[22px] font-bold">
                  {pkg.basePrice.toLocaleString()}원
                  <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                    부터
                  </span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--muted-foreground)]">
                      촬영 시간
                    </dt>
                    <dd className="mt-1 font-medium">{pkg.durationMin}분</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted-foreground)]">
                      보정 사진
                    </dt>
                    <dd className="mt-1 font-medium">{pkg.includedPhotos}장</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted-foreground)]">
                      원본 파일
                    </dt>
                    <dd className="mt-1 font-medium">
                      {pkg.rawIncluded ? "제공" : "미제공"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted-foreground)]">
                      결과물 전달
                    </dt>
                    <dd className="mt-1 font-medium">
                      촬영 후 {pkg.deliveryDays}일 이내
                    </dd>
                  </div>
                </dl>
                {pkg.retouchScope && (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    보정 범위 · {pkg.retouchScope}
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="mt-5 w-full"
                  disabled={
                    !canInquire ||
                    !availableCategories.some((c) => c.code === pkg.category)
                  }
                  onClick={() => choosePackage(pkg)}
                >
                  이 상품으로 문의하기
                  <Icon name="arrow" className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </section>

      <section id="schedule" className="mt-9 scroll-mt-20">
        <h2 className="text-xl font-bold">촬영 일정 확인하기</h2>
        <Card className="mt-4 p-5">
          {resources.availabilityError ? (
            <>
              <p className="text-sm text-[var(--danger)]">
                휴무일을 불러오지 못했어요.
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => setRefresh(refresh + 1)}
              >
                다시 확인하기
              </Button>
            </>
          ) : unavailable.length === 0 ? (
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
              현재 등록된 휴무일은 없어요.
              <br />
              희망 날짜와 시간의 촬영 가능 여부는 문의해주세요.
            </p>
          ) : (
            <>
              <p className="font-semibold">아래 날짜에는 촬영을 쉬어요</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unavailable.map((day) => (
                  <span
                    key={day.id}
                    className="rounded-lg bg-[var(--muted)] px-3 py-2 text-sm text-[var(--muted-foreground)]"
                  >
                    {formatShootDate(day.date.slice(0, 10))}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                그 외 날짜도 문의 후 촬영 가능 시간을 확인해주세요.
              </p>
            </>
          )}
        </Card>
      </section>

      <section id="reviews" className="mt-9 scroll-mt-20">
        <h2 className="text-xl font-bold">
          촬영한 고객들의 이야기{" "}
          <span className="text-[var(--brand-text)]">
            {resources.reviews.length}
          </span>
        </h2>
        <div className="mt-4 space-y-3">
          {resources.reviewsError ? (
            <Card className="p-5">
              <p className="text-sm text-[var(--danger)]">
                후기를 불러오지 못했어요.
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => setRefresh(refresh + 1)}
              >
                다시 불러오기
              </Button>
            </Card>
          ) : resources.reviews.length === 0 ? (
            <Card className="p-5 text-sm text-[var(--muted-foreground)]">
              아직 등록된 후기가 없어요. 작가의 작품과 촬영 상품을 먼저
              살펴보세요.
            </Card>
          ) : (
            resources.reviews.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex items-center gap-2 text-sm">
                  <Icon
                    name="star"
                    className="h-4 w-4 fill-current text-[var(--brand-text)]"
                  />
                  <strong>{review.ratingOverall.toFixed(1)}</strong>
                  <span className="text-[var(--muted-foreground)]">
                    촬영 고객
                    {review.category
                      ? ` · ${labels[review.category] || review.category}`
                      : ""}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {review.content || "별점으로 후기를 남겼어요."}
                </p>
              </Card>
            ))
          )}
        </div>
      </section>

      <section id="inquiry" className="mt-9 scroll-mt-20">
        {!canInquire ? (
          <Card className="p-5 text-sm text-[var(--muted-foreground)]">
            현재 촬영 문의를 받지 않는 작가예요.
            <Link href="/photographers" className="sf-link mt-3 block">
              다른 작가 둘러보기
            </Link>
          </Card>
        ) : !showInquiry ? (
          <Card className="p-5">
            <h2 className="text-xl font-bold">이 작가와 함께하고 싶다면</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
              원하는 촬영을 알려주세요.
              <br />
              문의만으로 예약이나 결제가 확정되지 않아요.
            </p>
            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={() => setShowInquiry(true)}
            >
              촬영 문의하기
              <Icon name="message" />
            </Button>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">어떤 촬영을 원하세요?</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInquiry(false)}
                aria-label="문의 접기"
              >
                <Icon name="close" />
              </Button>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-[var(--muted-foreground)]">
              조건을 남겨주시면 작가가 견적을 보내드려요.
              <br />
              문의만으로 예약이나 결제가 확정되지 않아요.
            </p>
            <form className="space-y-5" onSubmit={submitInquiry}>
              {selectedPackage && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--brand-muted)] p-4">
                  <div>
                    <p className="text-xs text-[var(--brand-text)]">
                      선택한 상품
                    </p>
                    <p className="mt-1 font-semibold">
                      {selectedPackage.title}
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedPackage.basePrice.toLocaleString()}원부터
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => changeDraft({ packageId: "" })}
                  >
                    선택 해제
                  </Button>
                </div>
              )}
              <div>
                <Label htmlFor="shootCategoryId">촬영 종류</Label>
                <select
                  id="shootCategoryId"
                  required
                  value={draft.categoryId}
                  onChange={(e) =>
                    changeDraft({ categoryId: e.target.value, packageId: "" })
                  }
                  className={selectClass}
                >
                  {availableCategories.length === 0 && (
                    <option value="">촬영 분야를 불러오지 못했어요</option>
                  )}
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {availableCategories.length === 0 && (
                  <button
                    type="button"
                    className="sf-link mt-2 text-sm"
                    onClick={() => setRefresh(refresh + 1)}
                  >
                    다시 불러오기
                  </button>
                )}
              </div>
              {supportedModes.length > 0 && (
                <div>
                  <Label htmlFor="captureModeId">촬영 방식</Label>
                  <select
                    id="captureModeId"
                    value={draft.captureModeId}
                    onChange={(e) =>
                      changeDraft({
                        captureModeId: e.target.value,
                        packageId: "",
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">작가와 상담 후 결정할게요</option>
                    {supportedModes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="shootDate">희망 날짜</Label>
                  <Input
                    id="shootDate"
                    type="date"
                    min={koreaToday()}
                    required
                    value={draft.date}
                    onChange={(e) => changeDraft({ date: e.target.value })}
                    aria-invalid={blocked}
                    aria-describedby={blocked ? "blocked-date" : undefined}
                    className="px-3"
                  />
                </div>
                <div>
                  <Label htmlFor="shootTime">희망 시간</Label>
                  <Input
                    id="shootTime"
                    type="time"
                    required
                    value={draft.time}
                    onChange={(e) => changeDraft({ time: e.target.value })}
                    className="px-3"
                  />
                </div>
              </div>
              {blocked && (
                <p
                  id="blocked-date"
                  role="alert"
                  className="text-sm text-[var(--danger)]"
                >
                  작가의 휴무일이에요. 다른 날짜를 골라주세요.
                </p>
              )}
              <div>
                <Label htmlFor="location">촬영 장소</Label>
                <Input
                  id="location"
                  required
                  maxLength={200}
                  placeholder="예: 서울 성동구 서울숲"
                  value={draft.location}
                  onChange={(e) => changeDraft({ location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="headcount">촬영 인원</Label>
                <Input
                  id="headcount"
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={draft.headcount}
                  onChange={(e) => changeDraft({ headcount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="purpose">원하는 촬영을 알려주세요</Label>
                <Textarea
                  id="purpose"
                  required
                  rows={4}
                  maxLength={3000}
                  placeholder="예: 가족 4명과 강아지가 함께하는 자연스러운 야외 사진을 남기고 싶어요."
                  value={draft.purpose}
                  onChange={(e) => changeDraft({ purpose: e.target.value })}
                />
              </div>
              {inquiryError && (
                <p role="alert" className="text-sm text-[var(--danger)]">
                  {inquiryError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || blocked || !draft.categoryId}
                className="w-full"
              >
                {isSubmitting
                  ? "문의를 보내고 있어요"
                  : user
                    ? "작가에게 문의 보내기"
                    : "로그인하고 문의 보내기"}
              </Button>
              {!user && (
                <p className="text-center text-xs text-[var(--muted-foreground)]">
                  로그인 후 작성한 문의를 이어서 보낼 수 있어요
                </p>
              )}
            </form>
          </Card>
        )}
      </section>

      {!showInquiry && canInquire && (
        <div className="sf-mobile-action pointer-events-none fixed right-0 left-0 z-30 px-5">
          <div className="sf-card pointer-events-auto mx-auto flex max-w-[600px] items-center justify-between gap-3 rounded-2xl bg-[var(--card)] p-4 shadow-[0_4px_24px_rgb(25_31_40/0.12)]">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {minimumPrice === null
                  ? "원하는 촬영에 맞춰"
                  : "촬영 기본 가격"}
              </p>
              <p className="mt-1 text-lg font-bold">
                {minimumPrice === null
                  ? "견적 상담"
                  : `${minimumPrice.toLocaleString()}원부터`}
              </p>
            </div>
            <Button onClick={() => setShowInquiry(true)}>촬영 문의하기</Button>
          </div>
        </div>
      )}

      <dialog
        ref={photoDialog}
        aria-label="포트폴리오 사진 크게 보기"
        onClick={(e) => {
          if (e.target === e.currentTarget) photoDialog.current?.close();
        }}
        onClose={() => setSelectedPhoto(null)}
        className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-40px)] max-w-[800px] rounded-2xl bg-[var(--card)] p-3 backdrop:bg-black/70"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="px-2 text-sm font-semibold">
            {selectedPhoto?.category?.label || "포트폴리오"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => photoDialog.current?.close()}
            aria-label="사진 닫기"
          >
            <Icon name="close" />
          </Button>
        </div>
        {selectedPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveAssetUrl(selectedPhoto.imageUrl)}
            alt={`${name} 작가의 ${selectedPhoto.category?.label || "촬영"} 작품`}
            className="max-h-[75vh] w-full rounded-xl object-contain"
          />
        )}
      </dialog>
    </div>
  );
}

export default function PhotographerProfilePage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center">작가 프로필을 준비하고 있어요</p>
      }
    >
      <ProfilePage />
    </Suspense>
  );
}
