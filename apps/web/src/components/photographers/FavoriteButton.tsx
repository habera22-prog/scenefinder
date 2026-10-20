import { Icon } from "@/components/ui/Icon";

export function FavoriteButton({
  isFavorited,
  isBusy,
  onToggle,
  className = "",
}: {
  isFavorited: boolean;
  isBusy?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isBusy}
      aria-label={isFavorited ? "찜 해제" : "찜하기"}
      aria-pressed={isFavorited}
      className={`sf-favorite inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${className}`}
    >
      <Icon
        name="heart"
        className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`}
      />
    </button>
  );
}
