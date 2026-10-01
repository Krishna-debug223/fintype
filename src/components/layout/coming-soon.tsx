import { Card } from "@/components/ui/card";

export interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function ComingSoon({ eyebrow, title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <Card className="w-full p-8 sm:p-12">
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          {description}
        </p>
        <div aria-hidden="true" className="mt-8 h-px bg-border" />
        <p className="mt-5 font-mono text-sm text-muted">
          This desk opens in a later build stage.
        </p>
      </Card>
    </div>
  );
}
