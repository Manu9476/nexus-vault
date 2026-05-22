import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/40 px-2.5 py-0.5 text-xs text-zinc-200",
        className
      )}
      {...props}
    />
  );
}

