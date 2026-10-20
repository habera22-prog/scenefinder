export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg bg-[var(--brand-muted)] px-2.5 py-1 text-xs font-medium text-[var(--brand-text)] ${className}`}
    >
      {children}
    </span>
  );
}
