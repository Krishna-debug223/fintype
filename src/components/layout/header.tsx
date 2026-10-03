import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { isAuthConfigured, isDatabaseConfigured } from "@/server/config";

import { Logo } from "./logo";

const navigation = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/daily", label: "Daily" },
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
] as const;

export async function Header() {
  const user = await getCurrentUser();
  const configured = isAuthConfigured() && isDatabaseConfigured();
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Logo />
        <nav
          aria-label="Primary"
          className="ml-auto hidden items-center gap-1 md:flex"
        >
          {navigation.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <Link
              className="rounded-md px-2 py-1 text-sm text-muted hover:text-foreground"
              href="/account"
            >
              {user.name ?? user.email ?? "Account"}
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        ) : configured ? (
          <Link className="ml-auto md:ml-2" href="/signin">
            <Button variant="secondary">Sign in</Button>
          </Link>
        ) : (
          <Button
            aria-disabled="true"
            className="ml-auto md:ml-2"
            disabled
            title="Account features are not configured"
            variant="secondary"
          >
            Sign in
          </Button>
        )}
      </div>
      <nav
        aria-label="Primary mobile"
        className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:hidden"
      >
        {navigation.map((item) => (
          <Link
            className="shrink-0 rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
