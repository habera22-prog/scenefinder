import Link from "next/link";
import type { PhotographerSummary } from "@/lib/types";
import { resolveAssetUrl } from "@/lib/asset";
import { photographerName } from "@/lib/discovery";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "./FavoriteButton";

export function PhotographerCard({
  photographer,
  isFavorited,
  isBusy,
  onToggleFavorite,
  categoryLabels = {},
  searchContext = "",
}: {
  photographer: PhotographerSummary;
  isFavorited?: boolean;
  isBusy?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  categoryLabels?: Record<string, string>;
  searchContext?: string;
}) {
  const name = photographerName(photographer);
  const thumbnail = photographer.portfolios?.[0]?.imageUrl;
  const hasPrice =
    photographer.startingPrice !== null &&
    photographer.startingPrice !== undefined;
  return (
    <article className="sf-card sf-card-hover relative min-w-0 overflow-hidden rounded-2xl bg-[var(--card)]">
      <Link
        href={`/photographers/${photographer.id}${searchContext ? `?${searchContext}` : ""}`}
        aria-label={`${name} 작가 프로필 보기`}
        className="block h-full"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--muted)]">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveAssetUrl(thumbnail)}
              alt={`${name} 작가의 대표 작품`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]">
              <Icon name="photo" className="h-9 w-9" />
              <span className="text-sm">작품을 준비하고 있어요</span>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {photographer.verificationStatus === "verified" && (
              <Badge>
                <Icon name="check" className="h-3 w-3" />
                심사 완료
              </Badge>
            )}
            <span className="rounded-lg bg-[var(--muted)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
              {photographer.photographerType === "business"
                ? "사업자 작가"
                : "프리랜서 작가"}
            </span>
          </div>
          <h3 className="truncate text-lg font-bold">{name}</h3>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            {photographer.activeRegions.join(" · ") || "활동 지역 문의"}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            {photographer.categories
              .map((code) => categoryLabels[code] || code)
              .join(" · ")}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-sm">
            {photographer.avgRating !== null ? (
              <>
                <Icon
                  name="star"
                  className="h-4 w-4 fill-current text-[var(--brand-text)]"
                />
                <span className="font-semibold">
                  {Number(photographer.avgRating).toFixed(1)}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  후기 {photographer.reviewCount ?? 0}개
                </span>
              </>
            ) : (
              <span className="text-[var(--muted-foreground)]">
                첫 후기를 기다리고 있어요
              </span>
            )}
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <p className="text-lg font-bold">
              {hasPrice ? (
                <>
                  {photographer.startingPrice!.toLocaleString()}원
                  <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                    부터
                  </span>
                </>
              ) : (
                "맞춤 견적 문의"
              )}
            </p>
            <Icon
              name="arrow"
              className="mb-1 h-4 w-4 shrink-0 text-[var(--brand-text)]"
            />
          </div>
          {hasPrice && photographer.startingDurationMin && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {photographer.startingDurationMin}분 촬영 기준 · 추가 옵션 별도
            </p>
          )}
        </div>
      </Link>
      {onToggleFavorite && (
        <FavoriteButton
          isFavorited={isFavorited ?? false}
          isBusy={isBusy}
          onToggle={onToggleFavorite}
          className="absolute top-3 right-3 bg-[var(--card)] shadow-sm"
        />
      )}
    </article>
  );
}
