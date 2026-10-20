import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-5 py-3 text-base",
  lg: "min-h-14 px-6 py-3.5 text-[17px]",
};

export function buttonStyles(variant: Variant = "primary", size: Size = "md") {
  return `sf-button sf-button-${variant} inline-flex items-center justify-center gap-2 rounded-xl font-semibold ${sizeClasses[size]}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${buttonStyles(variant, size)} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
