# FinType anti-cheat and replay validation

The browser is an input recorder, not an authority. A signed-in submission includes a stable test id, the exact settings and seed, a compact relative-time keystroke log, and client claims for display metrics. The server regenerates the same deterministic words and feeds the log through the framework-free engine in `src/engine/replay.ts`.

## Acceptance pipeline

1. Zod validates the envelope, log size, UUID, settings, timestamps, and printable characters.
2. The server rejects logs with decreasing timestamps, future or stale client dates, invalid daily seeds, or input after a time-test deadline.
3. It recomputes WPM, raw WPM, accuracy, consistency, errors, duration, and character breakdown.
4. Client claims must match the replay result within display rounding tolerance; mismatches are rejected.
5. A hard WPM ceiling is rejected. Review-band runs and timing anomalies are stored as `flagged` and excluded from public boards until an admin approves them.
6. Custom tests, retries, flagged runs, rejected runs, and daily runs are excluded from the all-time/weekly personal-best board according to the validation result.

The exact thresholds are named in `src/server/validation/constants.ts` so a threshold change is reviewable and testable. Current signals include hard/review WPM ceilings, near-perfect high-speed runs, uniform timing, sub-15ms intervals, stale/future clocks, and daily-seed mismatch.

## What is retained

Validated tests retain the settings, result, seed, and a compact keystroke log for replay and review. Audit rows store reasons and ids, never raw IP addresses or authentication secrets. Operators should apply a retention job to remove old logs after the review window while keeping aggregate results.

## Review policy

Flagged rows appear under `/admin` for an allow/reject decision. Approval changes leaderboard eligibility; rejection keeps the private row but removes it from rankings. A ban hides all rows from public boards and blocks future verified submissions until an administrator lifts it.

This is abuse mitigation, not proof of human identity. A determined client can still imitate plausible input, so production deployments should combine replay checks with rate limits, account reputation, and periodic manual review.
