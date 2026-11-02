import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent/60 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
