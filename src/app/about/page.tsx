import { PageFrame } from "@/components/layout/page-frame";
import { Card } from "@/components/ui/card";

const faqs = [
  [
    "Why Tab then Enter?",
    "Tab arms a deliberate restart without stealing focus from navigation. Enter confirms it; Shift+Tab remains normal browser navigation.",
  ],
  [
    "Why is my WPM different from another site?",
    "FinType uses net characters divided by five, elapsed test time, and its own finance-heavy content. Raw WPM does not subtract mistakes.",
  ],
  [
    "Is my data stored online?",
    "Not yet. Completed tests, settings, and profile totals stay in this browser. Prompt 5 adds an optional account-backed repository.",
  ],
];

export default function AboutPage() {
  return (
    <PageFrame
      eyebrow="About FinType"
      title="Practice the work, not filler words."
      description="FinType is a focused typing platform for the vocabulary, figures, and formulas used in modern finance."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Metrics in plain language</h2>
          <dl className="mt-5 space-y-4 text-sm leading-6">
            <div>
              <dt className="font-medium text-foreground">Net WPM</dt>
              <dd className="text-muted">
                Correct characters ÷ 5 ÷ elapsed minutes.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Raw WPM</dt>
              <dd className="text-muted">
                All typed characters ÷ 5 ÷ elapsed minutes, before mistake
                deductions.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Accuracy</dt>
              <dd className="text-muted">
                Correct keystrokes divided by correct plus incorrect keystrokes.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Consistency</dt>
              <dd className="text-muted">
                A coefficient-of-variation score over the per-second raw WPM
                series.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Signature accuracy
              </dt>
              <dd className="text-muted">
                Separate accuracy for letters, digits, and symbols so
                finance-specific weaknesses stay visible.
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Rank ladder</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Intern", 0],
              ["Analyst", 30],
              ["Associate", 45],
              ["VP", 60],
              ["Director", 75],
              ["MD", 90],
            ].map(([rank, wpm]) => (
              <div className="rounded-md border border-border p-3" key={rank}>
                <p className="font-medium text-foreground">{rank}</p>
                <p className="mt-1 font-mono text-accent">{wpm}+ WPM</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Stats rank uses the best eligible 60-second Terms or Mixed test at
            medium difficulty or harder. Custom and easy-content tests are
            excluded from rank.
          </p>
        </Card>
      </div>
      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold">Streaks and daily rules</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          A local streak day requires one completed, non-aborted test of at
          least 15 seconds or 25 words. Streaks use your local calendar; the
          Daily Challenge uses UTC. A current streak continues when the last
          qualifying day is today or yesterday. The first completed Daily
          attempt for a UTC date is recorded; later retries are for practice.
        </p>
      </Card>
      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <kbd className="font-mono text-accent">Tab → Enter</kbd> new test
          </p>
          <p>
            <kbd className="font-mono text-accent">Shift+Enter</kbd> retry same
            text
          </p>
          <p>
            <kbd className="font-mono text-accent">Escape</kbd> restart
          </p>
          <p>
            <kbd className="font-mono text-accent">Ctrl/Option+Backspace</kbd>{" "}
            delete word
          </p>
        </div>
      </Card>
      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <div className="mt-4 space-y-5">
          {faqs.map(([question, answer]) => (
            <div key={question}>
              <h3 className="font-medium text-foreground">{question}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 border-t border-border pt-5 text-sm text-muted">
          Privacy note: all data currently stays on this device.
        </p>
      </Card>
    </PageFrame>
  );
}
