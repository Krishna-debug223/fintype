import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { SegmentedControl } from "@/components/ui/segmented-control";

const modeOptions = [
  { label: "terms", value: "terms" },
  { label: "office", value: "office" },
  { label: "numbers", value: "numbers" },
  { label: "excel", value: "excel" },
  { label: "mixed", value: "mixed" },
] as const;

const lengthOptions = [
  { label: "15", value: "15" },
  { label: "30", value: "30" },
  { label: "60", value: "60" },
  { label: "120", value: "120" },
] as const;

export function TestMockup() {
  return (
    <section
      aria-labelledby="typing-preview-title"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-20"
    >
      <h1 className="sr-only" id="typing-preview-title">
        FinType test preview
      </h1>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-background/35 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Test mode preview"
              options={modeOptions}
              readOnly
              value="terms"
            />
            <SegmentedControl
              label="Test length preview"
              options={lengthOptions}
              readOnly
              value="30"
            />
          </div>
          <div className="flex items-center gap-5 px-1 font-mono text-xs text-muted">
            <span>
              <span className="text-foreground">30</span>s
            </span>
            <span>
              <span className="text-foreground">en</span> · finance
            </span>
          </div>
        </div>

        <div className="relative px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--theme-text)_1px,transparent_1px),linear-gradient(90deg,var(--theme-text)_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025]"
          />
          <p className="relative mx-auto max-w-4xl font-mono text-[clamp(1.35rem,3vw,2.25rem)] leading-[1.65] tracking-[-0.035em]">
            <span className="text-correct">
              Enterprise value equals equity value{" "}
            </span>
            <span className="text-incorrect underline decoration-incorrect/60 decoration-2 underline-offset-4">
              pluss
            </span>
            <span className="relative text-correct">
              {" cash"}
              <span
                aria-hidden="true"
                className="absolute top-[0.1em] -right-[0.12em] h-[1.2em] w-[2px] bg-accent motion-safe:animate-[caret-blink_1.05s_steps(1,end)_infinite]"
              />
            </span>
            <span className="text-muted">
              {
                " less debt, while an accretion dilution analysis measures the impact on pro forma EPS."
              }
            </span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-4 text-sm text-muted">
          <Kbd>tab</Kbd>
          <span>restart</span>
          <span aria-hidden="true" className="mx-2 text-border">
            ·
          </span>
          <Kbd>esc</Kbd>
          <span>settings</span>
        </div>
      </Card>
      <p className="mt-5 text-center font-mono text-xs tracking-[0.18em] text-muted uppercase">
        Static visual preview · typing is disabled in this build
      </p>
    </section>
  );
}
