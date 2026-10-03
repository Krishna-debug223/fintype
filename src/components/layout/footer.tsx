import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/70" data-focus-chrome>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Built for the keystrokes behind the numbers.</p>
        <div className="flex gap-4">
          <Link className="hover:text-foreground" href="/about">
            About
          </Link>
          <Link className="hover:text-foreground" href="/about#privacy">
            Privacy
          </Link>
          <span>v0.2</span>
        </div>
      </div>
    </footer>
  );
}
