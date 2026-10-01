import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-20 sm:px-6">
      <Card className="w-full p-8 text-center sm:p-12">
        <p className="font-mono text-sm text-accent">404 · ticker not found</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          This page is off the tape.
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">
          The route may have moved, or it may belong to a later FinType build.
        </p>
        <Link
          className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/"
        >
          Return to the test
        </Link>
      </Card>
    </div>
  );
}
