"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  History,
  Keyboard,
  Menu,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Test", icon: Keyboard },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: (typeof navigation)[number] & { onClick?: () => void }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? "bg-accent/10 text-accent" : "text-muted"}`}
      href={href}
      {...(onClick ? { onClick } : {})}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  );
}

export function PrimaryNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="Primary"
        className="ml-auto hidden items-center gap-1 md:flex"
      >
        {navigation.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
      <div className="relative ml-auto md:hidden">
        <button
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? (
            <X aria-hidden="true" size={20} />
          ) : (
            <Menu aria-hidden="true" size={20} />
          )}
        </button>
        {open ? (
          <nav
            aria-label="Primary mobile"
            className="absolute top-13 right-0 z-40 min-w-56 rounded-lg border border-border bg-surface p-2 shadow-panel"
          >
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}
