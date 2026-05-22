"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-orange/70 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-nexus-orange text-white hover:bg-nexus-orange",
        outline:
          "border border-nexus-border bg-transparent text-nexus-text hover:border-nexus-orange hover:text-nexus-orange",
        ghost: "text-nexus-text hover:bg-nexus-surface hover:text-nexus-orange",
        secondary:
          "border border-nexus-border bg-nexus-surface text-nexus-text hover:border-nexus-orange hover:text-nexus-orange",
        link: "text-nexus-orange underline underline-offset-4 hover:text-nexus-orange",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

