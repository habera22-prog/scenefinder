export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`sf-card rounded-2xl bg-[var(--card)] text-[var(--foreground)] ${className}`}
    >
      {children}
    </div>
  );
}
