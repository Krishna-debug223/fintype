import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { isAuthConfigured, isDatabaseConfigured } from "@/server/config";

import { Logo } from "./logo";
import { PrimaryNav } from "./primary-nav";

export async function Header() {
  const user = await getCurrentUser();
  const configured = isAuthConfigured() && isDatabaseConfigured();
  return (
    <header className="border-b border-border/70" data-focus-chrome>
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Logo />
        <PrimaryNav />
        {user ? (
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <Link
              className="rounded-md px-2 py-1 text-sm text-muted hover:text-foreground"
              href="/account"
            >
              {user.name ?? user.email ?? "Account"}
            </Link>
            <Link
              className="rounded-md px-2 py-1 text-sm text-muted hover:text-foreground"
              href="/history"
            >
              History
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
    </header>
  );
}
