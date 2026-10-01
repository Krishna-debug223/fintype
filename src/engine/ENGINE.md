# FinType engine contract

`src/engine` is the deterministic core shared by the browser and future server-side replay validation. It is pure TypeScript: no React, DOM, Zustand, Next.js, clocks, timers, or unseeded randomness. Callers supply every timestamp.

## State model

`TestState` owns:

- an ordered array of `{ target, typed, submitted }` word objects;
- the active word index and `idle | running | finished` status;
- explicit start, last-input, and end timestamps;
- an immutable `TestSettings` snapshot, including the content seed;
- the compact accepted-input log; and
- historical correct, incorrect, extra, and correction counters.

Word updates copy the words array and only the edited word object. Unchanged word objects preserve identity so memoized React word components can skip rendering.

The timer starts on the first accepted printable character. Idle correction and space actions are ignored. Accepted log times are integer milliseconds relative to that first character. Out-of-order caller timestamps are clamped to the latest accepted timestamp.

## Input rules

`applyInput(state, input, timestampMs)` is the only input reducer.

- `char` accepts one printable Unicode code point, compares it by position, and allows at most ten extras per word.
- `space` requires a non-empty word. It submits incomplete words as missed, records a correct space only for an exact word, and respects `stopOnError`.
- `backspace` removes one Unicode code point. From an empty active word it can re-enter only an incorrect previous word.
- `deleteWord` clears the active word, or re-enters and clears an incorrect previous word.
- Both correction actions are disabled by confidence mode.
- Word tests end on the last target-length character or a final submitted word. Time tests end only through `finishTest`, at the configured deadline.
- Finished states and ignored actions return the original object and never append to the log.

JavaScript strings are split with `Array.from`, so surrogate-pair emoji are treated as one character. Full grapheme-cluster segmentation is intentionally deferred; the current replay contract is Unicode code-point based.

## Metrics

`getResult` returns the shared serializable `TestResult`:

- **Net WPM:** `(netCorrectCharacters / 5) / minutes`. Net characters include every character plus its submitted space for exact completed words, and positionally correct characters in the active word.
- **Raw WPM:** `(accepted char and space inputs / 5) / minutes`. Corrections do not erase historical raw input.
- **Accuracy:** `correctKeystrokes / (correctKeystrokes + incorrectKeystrokes) * 100`; it is 100 with no scored keystrokes.
- **Consistency:** `clamp(100 - populationStandardDeviation(perSecondRawWpm) / mean * 100, 0, 100)`, rounded to an integer. Fewer than two samples or a zero mean returns 0.
- **Errors:** historical incorrect keystrokes, including extras and incorrect submitted spaces.
- **Breakdown:** final visible correct, incorrect, extra, and missed character states.
- **Series:** one entry per elapsed second with cumulative net WPM, raw WPM for that bin, and errors in that bin. A final partial second uses its actual duration.

Rates return zero for zero or near-zero elapsed time, and all public results are finite. A time test that finishes normally always uses its configured duration. A word test uses the interval from its first accepted character to its final accepted input.

`createdAt` is `null` because `performance.now()` is monotonic rather than wall-clock time and the engine may not access `Date`. The persistence layer will attach an ISO timestamp later.

## Replay

`replay(words, settings, log)` creates an idle test, feeds each compact relative-time entry through `applyInput`, finishes time tests at the configured deadline, and calls `getResult`. The same words, settings, and accepted log therefore produce a byte-for-byte equivalent result object.

The seedable Mulberry32 utility hashes string seeds with stable FNV-1a. `pick` and `shuffle` use only that source; shuffling never mutates its input.
