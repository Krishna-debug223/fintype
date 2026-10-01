import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" &&
          "border-accent bg-accent text-background hover:opacity-90",
        variant === "secondary" &&
          "border-border bg-surface text-foreground hover:border-accent hover:text-accent",
        variant === "ghost" &&
          "border-transparent bg-transparent text-muted hover:text-foreground",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
