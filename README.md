# FinType

FinType is a finance-native typing platform for the words, figures, and formulas used in investment banking, private equity, equity research, sales and trading, and fintech. The repository now includes the production foundation, a deterministic replayable typing engine, and a fully playable Terms-mode test screen.

The full content system, accounts, database integrations, leaderboards, charts, and expanded results experience are deliberately reserved for later stages.

## Tech stack

- Next.js 16 App Router, React 19, and strict TypeScript (Webpack production builds for restricted CI compatibility)
- Tailwind CSS 4 with runtime CSS-variable themes
- Zustand and Zod installed for later client state and runtime validation
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

Open [http://localhost:3000](http://localhost:3000), click the typing area, and type. Terms mode supports timed and word-count tests, live metrics, corrections, keyboard restarts, and a compact results panel.

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
```

Install Playwright's Chromium browser once before the end-to-end suite:

```bash
pnpm exec playwright install chromium
```

## Project structure

```text
src/
├── app/                 App Router pages, layouts, metadata, and future APIs
├── engine/              Framework-free input, metrics, RNG, and replay logic
├── content/             Temporary seeded Terms content (full system is Prompt 3)
├── components/
│   ├── ui/              Generic accessible primitives
│   ├── typing/          Test-specific presentation
│   └── layout/          Shared shell components
├── lib/                 Utilities, constants, and future server clients
├── store/               Zustand stores
├── types/               Shared serializable domain contracts
└── styles/              Documentation for global styles and tokens
tests/
├── unit/                Vitest tests mirroring source behavior
└── e2e/                 Playwright user journeys
```

Each major folder includes an `index.ts` or local README that states its boundary.

## Design system and theming

The default visual direction is a restrained market terminal after hours: charcoal surfaces, subtle grid structure, tabular cues, and an amber focus color. Four themes ship now:

- `dark`: charcoal, soft grey, and amber
- `light`: neutral paper surfaces and deep green
- `terminal`: amber on near-black
- `wallstreet`: navy and gold

Semantic roles—background, surface, border, text, muted text, accent, correct, incorrect, and warning—are defined as CSS variables in `src/app/globals.css`. Tailwind maps utilities to those variables, so changing `data-theme` on `<html>` updates the whole interface without remounting components.

`ThemeProvider` owns the typed runtime API, stores the selected theme in `localStorage`, and applies it to the document root. A small inline boot script reads the same key before React hydrates, preventing a flash of the default theme. Inter is used for interface copy and JetBrains Mono for typing and data-oriented surfaces. Motion is subtle and disabled through `prefers-reduced-motion`.

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

## Assumptions and decisions

- `https://fintype.app` is a placeholder canonical origin for metadata, robots, and sitemap output; replace it when the production domain is chosen.
- Rank thresholds are inclusive at their lower bound: 30 WPM is Analyst, 45 is Associate, 60 is VP, 75 is Director, and 90 is MD. Negative and non-finite input is normalized to zero.
- `getNextRank` returns the next `Rank` object or `null` for MD.
- Dates in result contracts are ISO-8601 strings so results remain serializable across server and client boundaries.
- Character and WPM-series details use explicit structured objects rather than ambiguous tuples.
- The current picker controls on `/` are deliberately read-only, and the sign-in control is deliberately disabled.
- Radix primitives are used only where browser-level accessibility is easy to get wrong: dialogs and tooltips.
- No Open Graph image is generated in this foundation; title, description, card type, and canonical base defaults are configured.
- Unicode comparison is code-point based. This handles accented characters and surrogate-pair emoji without splitting them; multi-code-point grapheme clusters will need an explicit segmentation policy before international competitive validation.
- `deleteWord` counts as one correction action regardless of how many visible characters it clears.
- Try Again reuses the current seed; Next Test, Escape, and Tab then Enter generate a new seed.
- The temporary Terms list is intentionally unstructured and may repeat non-adjacent items. Prompt 3 replaces it with typed mode-specific generators.
- Engine results leave `createdAt` as `null`; the future persistence boundary attaches wall-clock metadata without compromising deterministic replay.

## Foundation checklist

- [x] Latest stable Next.js App Router scaffold with strict TypeScript and Tailwind CSS
- [x] pnpm scripts for development, build, start, lint, format, typecheck, unit tests, and e2e tests
- [x] Zustand and Zod installed without database, ORM, or auth packages
- [x] ESLint, Prettier with Tailwind sorting, Husky, and lint-staged configured
- [x] Vitest, Testing Library, and Playwright configured
- [x] Requested folders, aliases, ownership notes, and framework-free engine boundary
- [x] Shared settings, result, content, keystroke, character, rank, and length types
- [x] Centralized tunables plus tested `getRank` and `getNextRank`
- [x] Four runtime-switchable themes, optimized fonts, type scale, focus states, and reduced-motion support
- [x] Button, IconButton, SegmentedControl, Card, Tooltip, Dialog, Kbd, and ThemeProvider primitives
- [x] SVG wordmark and favicon
- [x] Responsive app shell and static finance test-screen preview
- [x] Leaderboard, Daily, Stats, History, Settings, and About stubs
- [x] Custom not-found and route error states
- [x] Metadata defaults, robots route, and sitemap stub
- [x] `.env.example`, `.gitignore`, `.editorconfig`, and repository documentation
- [x] Deterministic word-based engine with all specified correction, finish, and logging rules
- [x] Seeded RNG, metrics, per-second series, and byte-equivalent replay
- [x] Exhaustive unit coverage, fuzz invariants, and forbidden-import enforcement
- [x] Playable Terms test with IME-aware hidden input, focus recovery, smooth caret, and three-line scrolling
- [x] Persisted timed/word length controls, throttled live stats, and minimal ranked results
- [x] Playwright journeys for a perfect 15-second test and idle/restart keyboard behavior

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

Prompt 3 should replace the temporary list with the typed content system: deterministic seeded generators and validation for Terms, Office, Numbers, Excel, Mixed, Daily, and Custom modes, including difficulty, punctuation, number, and content-quality rules.
