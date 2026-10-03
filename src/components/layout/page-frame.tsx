"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} · FinType`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    descriptionMeta?.setAttribute("content", description);
  }, [description, title]);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
        {description}
      </p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
