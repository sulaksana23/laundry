import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground transition duration-150 focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  );
}
