import Link from "next/link";
import type { PhotographerSummary } from "@/lib/types";
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
  return (
    <Link href={`/photographers/${photographer.id}`}>
      <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
          사진
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {photographer.businessName}
            </h3>
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
