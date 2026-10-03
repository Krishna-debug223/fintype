# FinType

FinType is a finance-native typing platform for the words, figures, and formulas used in investment banking, private equity, equity research, sales and trading, and fintech. The repository includes a deterministic replayable typing engine, a fully playable multi-mode test screen, and a local-first results workspace.

Prompt 4 adds durable browser-local history, personal bests, daily records, rich result analysis, and the History, Stats, Settings, Daily, Leaderboard, and About routes. Prompt 5 adds an optional Neon/Postgres/Auth.js layer: deterministic server replay validation, idempotent submissions, profile/account routes, settings sync, reviewable anti-cheat flags, admin actions, Redis-aware limits, and server-backed leaderboards. Guest mode remains fully local when server variables are absent.

The current release adds Monkeytype-style focus mode, a large countdown/progress
timer, primary header navigation, green accent themes, and content version 2.
Read [`CONTENT.md`](CONTENT.md) for pool/version rules and
[`CHANGE-REPORT.md`](CHANGE-REPORT.md) for the release decisions.

## Tech stack

- Next.js 16 App Router, React 19, and strict TypeScript (Webpack production builds for restricted CI compatibility)
- Tailwind CSS 4 with runtime CSS-variable themes
- Zustand and Zod for client state and runtime validation
- Drizzle ORM, Postgres/Neon, Auth.js, Upstash, and Resend integrations (optional at runtime)
- Radix Dialog and Tooltip primitives for accessible overlays
- Vitest, Testing Library, and jsdom for unit/component tests
- Playwright configured for desktop and mobile end-to-end coverage
- ESLint, Prettier, Tailwind class sorting, Husky, and lint-staged
- pnpm 11

## Setup

Requirements: Node.js 20.9 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), click the typing area, and type. Terms, Office, Numbers, Excel, Mixed, and Daily modes support timed and word-count tests, live metrics, corrections, keyboard restarts, and rich results.

## Commands

```bash
pnpm dev          # local development server
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint with zero warnings allowed
pnpm format       # format and sort Tailwind classes
pnpm format:check # verify formatting without changing files
pnpm typecheck    # strict TypeScript check
pnpm test         # Vitest unit/component suite
pnpm test:e2e     # Playwright suite (install browsers first)
pnpm db:migrate   # apply db/migrations to DATABASE_URL
pnpm db:seed      # local demo profile (refuses production)
pnpm content:stats # pool sizes and repeat simulation
```

Install Playwright's Chromium browser once before the end-to-end suite:

```bash
pnpm exec playwright install chromium
```

## Project structure

```text
src/
├── app/                 App Router pages, layouts, metadata, and API routes
├── engine/              Framework-free input, metrics, RNG, and replay logic
├── content/             Deterministic finance-mode generators and daily seeds
├── components/
│   ├── ui/              Generic accessible primitives
│   ├── typing/          Test-specific presentation
│   └── layout/          Shared shell components
├── lib/                 Utilities, constants, local repository, and sync outbox
├── server/              Optional database, auth, rate limits, and replay validation
├── store/               Zustand stores
├── types/               Shared serializable domain contracts
└── styles/              Documentation for global styles and tokens
tests/
├── unit/                Vitest tests mirroring source behavior
└── e2e/                 Playwright user journeys
```

Each major folder includes an `index.ts` or local README that states its boundary.

## Design system and theming

The default visual direction is a restrained market terminal after hours: charcoal surfaces, subtle grid structure, tabular cues, and a mint-green focus color. Four themes ship now:

- `dark`: charcoal, soft grey, and `#3ddc84`
- `light`: neutral paper surfaces and `#176b4d`
- `terminal`: green phosphor `#32ff66` on pure black
- `wallstreet`: navy and gold

Semantic roles—background, surface, border, text, muted text, accent, correct, incorrect, and warning—are defined as CSS variables in `src/app/globals.css`. Tailwind maps utilities to those variables, so changing `data-theme` on `<html>` updates the whole interface without remounting components. Wallstreet deliberately keeps its gold identity.

`ThemeProvider` owns the typed runtime API, persists the selected theme through the local-data repository, and applies it to the document root. Inter is used for interface copy and JetBrains Mono for typing and data-oriented surfaces. Motion is subtle and disabled through `prefers-reduced-motion`.

## Conventions

- Keep `src/engine` pure TypeScript. It must not import React, browser APIs, or DOM types; the server will reuse it for anti-cheat replay validation.
- Put adjustable thresholds, option lists, storage keys, and product constants in `src/lib/constants.ts`.
- Treat shared types as serializable contracts across client, server, engine, and content layers.
- Keep route files thin. Reusable UI belongs under `components`; business rules belong in the engine or library layer.
- Validate data at trust boundaries with Zod when APIs and persistence are added.
- Prefer Server Components. Add `"use client"` only to the smallest interactive boundary.
- Use semantic theme utilities instead of literal colors in components.
- Add accessible names, keyboard behavior, visible focus states, and reduced-motion support with every new control.
- Use deterministic seeds for generated content and daily challenges so tests can be reproduced and validated.
- Do not add database, ORM, or authentication dependencies until their dedicated stage defines the data and identity boundaries.

## Typing engine and test screen

The complete server-replay contract is documented in [`src/engine/ENGINE.md`](src/engine/ENGINE.md). The reducer accepts explicit timestamps, uses structurally shared word state, logs only accepted input, and returns finite deterministic metrics. ESLint plus a dedicated unit test prevent framework, DOM, clock, timer, and `Math.random` access inside the engine.

The `/` route translates hidden-input keyboard events into engine actions. A `requestAnimationFrame` loop drives the deadline and throttles live statistics to four updates per second. The engine state remains the single source of game behavior; Zustand stores only persisted length selection and UI-level session output. Each word is memoized against its structurally shared word object and active state, so typing does not re-render unchanged word components.

### Local data, analysis, and results

Prompt 4 keeps the browser boundary behind [`src/lib/storage/repository.ts`](src/lib/storage/repository.ts). The Zustand local-data store consumes that repository instead of reading browser storage directly. Saved tests, settings, profile totals, personal bests, daily records, export/import, corruption recovery, quota handling, and cross-tab refresh are documented in [`DATA.md`](DATA.md). The results view derives replay-safe slow-word, mistyped-character, symbol-accuracy, rank-progress, personal-best, and WPM-series details from the same deterministic engine output. The chart is an inline SVG so the initial route stays light; a chart library can be swapped in behind the same data shape later.

The local repository now exposes a small outbox. After sign-in, a client can flush queued test envelopes through `/api/tests/batch`; failed batches back off and remain inspectable rather than being silently discarded. The authoritative server path regenerates content and recomputes metrics before writing tests, personal bests, daily results, and aggregate stats.

### Optional server layer

The server setup is documented in [`SETUP.md`](SETUP.md), the replay and review policy in [`ANTICHEAT.md`](ANTICHEAT.md), and the threat model/operational notes in [`SECURITY.md`](SECURITY.md). `/api/health` reports whether the database is configured; it does not make local-first mode unhealthy. `next-auth` is kept on the stable v4 API in this build while the adapter and schema remain Auth.js-compatible.

### Interaction bug report and verification checklist

The test screen keeps a visually hidden input for mobile keyboards and IME composition, but document-level keydown routing is the single source of truth for physical keyboard input. The listener ignores other editable controls and open dialogs, is installed and cleaned up as one effect, and refocuses the capture input only for test-owned actions. Losing focus therefore does not drop characters, while normal header/navigation focus remains reachable.

The caret is positioned inside the same relative content layer as the words. Its `offsetLeft`, `offsetTop`, and `offsetHeight` coordinates share `TYPING_LINE_HEIGHT_PX` with the text layout, and a `ResizeObserver`, font-ready callback, and reduced-motion-aware scroll keep it aligned after wrapping, resizing, theme changes, and long words. The default word style has no underline or shadow; only incorrect submissions and missed words are marked.

Manual smoke checklist:

- Click an empty page area or the header, then type: the first character still registers.
- Change test length and type immediately: the new test accepts input without an extra click.
- Press `Tab` during a test: navigation does not move, a short “Press Enter to restart” hint appears, and `Enter` starts a new seed. `Shift+Tab` remains normal browser navigation.
- Press `Escape` once to restart; press it again quickly to release capture focus. Clicking outside the test also leaves focus on the clicked control.
- Resize between narrow and wide viewports while typing and enable `prefers-reduced-motion`: the caret stays on the active wrapped line.
- Backspace after an incorrect submitted word: the caret returns to that word and clears it without jumping to a viewport-relative position.

The automated equivalents live in `tests/e2e/test-screen.spec.ts`; pure caret coordinates and the two-second Tab state machine are covered in `tests/unit/typing-layout.test.ts`.

## Assumptions and decisions

- `https://fintype.app` is a placeholder canonical origin for metadata, robots, and sitemap output; replace it when the production domain is chosen.
- Rank thresholds are inclusive at their lower bound: 30 WPM is Analyst, 45 is Associate, 60 is VP, 75 is Director, and 90 is MD. Negative and non-finite input is normalized to zero.
- `getNextRank` returns the next `Rank` object or `null` for MD.
- Dates in result contracts are ISO-8601 strings so results remain serializable across server and client boundaries.
- Character and WPM-series details use explicit structured objects rather than ambiguous tuples.
- The home picker exposes the local content modes and persists the selected length/mode; sign-in is visibly disabled until the optional account boundary is configured.
- Radix primitives are used only where browser-level accessibility is easy to get wrong: dialogs and tooltips.
- No Open Graph image is generated in this foundation; title, description, card type, and canonical base defaults are configured.
- Unicode comparison is code-point based. This handles accented characters and surrogate-pair emoji without splitting them; multi-code-point grapheme clusters will need an explicit segmentation policy before international competitive validation.
- `deleteWord` counts as one correction action regardless of how many visible characters it clears.
- Try Again reuses the current seed; Next Test, Escape, and Tab then Enter generate a new seed.
- Mode content is generated from compact deterministic finance-term banks. The generator is intentionally local and bounded; a larger curated content service can replace it without changing the engine contract.
- Finished tests are stored locally with wall-clock `createdAt` metadata, while engine replay remains deterministic. Aborted sessions are never persisted.
- The local repository intentionally keeps the newest 50 keystroke logs and caps history at 1,000 tests. Export files are versioned JSON envelopes; import supports merge and replace.
- The server stores replayable test records and profile aggregates only after authentication; local history remains the fallback source of truth for guests.

## Foundation checklist

- [x] Latest stable Next.js App Router scaffold with strict TypeScript and Tailwind CSS
- [x] pnpm scripts for development, build, start, lint, format, typecheck, unit tests, and e2e tests
- [x] Zustand and Zod installed for client state and runtime validation
- [x] ESLint, Prettier with Tailwind sorting, Husky, and lint-staged configured
- [x] Vitest, Testing Library, and Playwright configured
- [x] Requested folders, aliases, ownership notes, and framework-free engine boundary
- [x] Shared settings, result, content, keystroke, character, rank, and length types
- [x] Centralized tunables plus tested `getRank` and `getNextRank`
- [x] Four runtime-switchable themes, optimized fonts, type scale, focus states, and reduced-motion support
- [x] Button, IconButton, SegmentedControl, Card, Tooltip, Dialog, Kbd, and ThemeProvider primitives
- [x] SVG wordmark and favicon
- [x] Responsive app shell and static finance test-screen preview
- [x] Leaderboard, Daily, Stats, History, Settings, and About routes with local-first data states
- [x] Custom not-found and route error states
- [x] Metadata defaults, robots route, and sitemap stub
- [x] `.env.example`, `.gitignore`, `.editorconfig`, and repository documentation
- [x] Deterministic word-based engine with all specified correction, finish, and logging rules
- [x] Seeded RNG, metrics, per-second series, and byte-equivalent replay
- [x] Exhaustive unit coverage, fuzz invariants, and forbidden-import enforcement
- [x] Playable Terms test with IME-aware hidden input, document-level focus recovery, offset-based caret, and three-line scrolling
- [x] Persisted timed/word length controls, throttled live stats, and rich analyzed results
- [x] Deterministic Terms, Office, Numbers, Excel, Mixed, and Daily content generators
- [x] Versioned local repository with validation, migration, quota handling, export/import, and cross-tab refresh
- [x] History filters/detail/delete/export, Stats summaries/activity, Settings persistence, and Daily/Leaderboard local states
- [x] Optional Drizzle/Postgres schema, migrations, seed script, health endpoint, and Docker Postgres workflow
- [x] Optional Auth.js sign-in, account/onboarding/profile routes, settings endpoint, idempotent test and batch APIs
- [x] Deterministic server replay validation, anti-cheat flags, admin review/ban actions, hashed-IP limits, and security headers
- [x] Server-backed all-time, weekly, and daily leaderboard queries with privacy and ban filtering
- [x] Local sync outbox with bounded retries and a documented server batch path
- [x] Playwright journeys for focus resilience, Tab/Escape behavior, wrapped caret bounds, backspace across a word boundary, a perfect 15-second test, and idle/restart keyboard behavior

## Verification

Run the exact foundation gate from the repository root:

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For a quick manual pass after starting the dev server:

1. Start a timed or word-count test from `/`, switch between the local modes, and finish it.
2. Confirm the result view animates WPM, shows rank progress, and offers Retry same text, Next test, and Share.
3. Open `/history`, filter by mode or date, inspect a row, export JSON/CSV, and delete a saved test.
4. Open `/stats` to inspect summary cards, personal bests, streak, and the activity grid.
5. Open `/settings`, change theme/font/caret/live-stat preferences, reload, and verify they persist.
6. Open `/daily`, start the seeded challenge, and confirm the recorded local attempt appears afterward.
7. Open `/leaderboard` and verify the local personal-best table plus the clearly labeled global placeholder.
8. Open `/about` to review the product notes, rank thresholds, shortcuts, and privacy explanation.
9. Run `pnpm test` and `pnpm test:e2e` for the automated data, engine, focus, caret, and results coverage.
10. Run the full gate below before shipping.

For production, configure the optional services, run migrations, and replace the placeholder canonical origin in `src/app/layout.tsx` and metadata routes. A small follow-up can add a scheduled log-retention worker and stricter nonce-based CSP once the hosting environment’s nonce plumbing is chosen.
