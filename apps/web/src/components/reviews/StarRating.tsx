export function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-lg leading-none ${
              n <= value ? "text-brand" : "text-border"
            }`}
            aria-label={`${n}점`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
