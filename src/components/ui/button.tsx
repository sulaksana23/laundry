import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
  loadingText?: string;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:brightness-95",
  secondary: "border border-border bg-surface-raised text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "bg-danger/15 text-danger hover:bg-danger/20",
};

export function Button({
  className,
  variant = "secondary",
  isLoading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition duration-150 hover:-translate-y-px disabled:pointer-events-none disabled:transform-none disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {isLoading && <Spinner />}
      {isLoading ? loadingText ?? children : children}
    </button>
  );
}
