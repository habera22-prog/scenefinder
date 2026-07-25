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
      className={`text-lg leading-none transition-colors disabled:opacity-50 ${
        isFavorited ? "text-danger" : "text-muted-foreground hover:text-danger"
      } ${className}`}
    >
      {isFavorited ? "♥" : "♡"}
    </button>
  );
}
