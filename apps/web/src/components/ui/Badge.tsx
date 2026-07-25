export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-medium text-brand ${className}`}
    >
      {children}
    </span>
  );
}
