"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange?: (value: T) => void;
  readOnly?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  readOnly = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      aria-label={label}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-lg bg-background/65 p-1",
        className,
      )}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected
                ? "bg-surface text-accent shadow-sm"
                : "text-muted hover:text-foreground",
              readOnly && "cursor-default",
            )}
            key={option.value}
            onClick={() => {
              if (!readOnly) onValueChange?.(option.value);
            }}
            tabIndex={readOnly ? -1 : 0}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
