"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-20 sm:px-6">
      <Card className="w-full p-8 text-center sm:p-12">
        <p className="font-mono text-sm text-incorrect">execution error</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          The model did not reconcile.
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">
          The page hit an unexpected condition. Retry the current view to start
          from a clean state.
        </p>
        <Button className="mt-8" onClick={reset}>
          Retry
        </Button>
      </Card>
    </div>
  );
}
