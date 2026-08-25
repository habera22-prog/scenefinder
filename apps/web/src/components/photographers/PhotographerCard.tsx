import Link from "next/link";
import type { PhotographerSummary } from "@/lib/types";
import { resolveAssetUrl } from "@/lib/asset";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/photographers/FavoriteButton";

export function PhotographerCard({
  photographer,
  isFavorited,
  onToggleFavorite,
}: {
  photographer: PhotographerSummary;
  isFavorited?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const thumbnailUrl = photographer.portfolios?.[0]?.imageUrl;
  return (
    <Link href={`/photographers/${photographer.id}`}>
      <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveAssetUrl(thumbnailUrl)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path
                d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {photographer.businessName}
            </h3>
            <Badge className="shrink-0 bg-amber-100 text-amber-700">
              {photographer.photographerType === "freelancer" ? "SceneFinder 인증" : "사업자 인증"}
            </Badge>
            {photographer.avgRating !== null && (
              <span className="shrink-0 text-sm text-muted-foreground">
                ★ {photographer.avgRating.toFixed(1)}
              </span>
            )}
            {onToggleFavorite && (
              <FavoriteButton
                isFavorited={isFavorited ?? false}
                onToggle={onToggleFavorite}
                className="ml-auto"
              />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {photographer.activeRegions.join(", ") || "활동 지역 미등록"} · 예약{" "}
            {photographer.completedBookingsCount}건
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {photographer.moodTags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
