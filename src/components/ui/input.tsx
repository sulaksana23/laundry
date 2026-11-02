import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/80 focus:border-accent/60 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
