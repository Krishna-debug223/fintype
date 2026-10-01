import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      aria-label="FinType home"
      className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      href="/"
    >
      <svg aria-hidden="true" className="size-7" viewBox="0 0 28 28">
        <path d="M4 21V7h8.5v3H7.4v2.8h4.4v3H7.4V21H4Z" fill="currentColor" />
        <path d="M15 7h9v3h-2.8v11h-3.4V10H15V7Z" fill="var(--theme-accent)" />
      </svg>
      {!compact ? (
        <span className="font-mono text-base font-semibold tracking-[-0.04em] text-foreground">
          fin<span className="text-accent">type</span>
        </span>
      ) : null}
    </Link>
  );
}
