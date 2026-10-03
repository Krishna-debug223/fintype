# FinType release change report

## Focus mode and timer

Focus mode enters on the first accepted character, hides chrome with opacity,
visibility, pointer-events, and `inert`, and exits on genuine pointer movement,
touch, blur, restart, completion, or modal open. The new timer is large,
left-aligned above the words, uses tabular monospace digits, shows `typed/total`
for word tests, and uses a 2px low-opacity progress treatment only through the
timer's accent styling (no separate bar was added because it made the compact
test card feel busy). Screen-reader announcements happen at start, 10 seconds,
5 seconds, and finish.

## History and navigation

Previously History lived only in the footer beside About, so it was easy to
miss and was treated like a secondary link. It now lives in the primary header
after Stats, with a history icon, accessible 44px target, active state, and a
mobile menu entry. Results also include View history; the footer is secondary
only.

## Green accent

The default dark accent is `#3ddc84`; light uses `#176b4d`; terminal uses
`#32ff66` on pure black; Wallstreet intentionally keeps its identity gold
accent `#d7ad55`. Correct text remains neutral and errors remain red with
underlines/strikes in addition to color, so red/green color-vision differences
do not carry the only meaning.

## Content

Content v1 is frozen. Content v3 replaces synthetic compound generation with a
source-grounded finance lexicon: common reporting, accounting, modelling,
markets, banking, and risk words are explicit entries, with frequency tiers
that favor everyday professional vocabulary. Established finance phrases and
symbols remain available, but synthetic `root-modifier` combinations are gone.
The deterministic formula generation and shuffle-and-draw behavior remain in
place without within-test repeats until the filtered pool is exhausted. See
`CONTENT.md` and `pnpm content:stats` for live counts and simulation output.

## Assumptions and deviations

- The existing 15/30/60/120 second UI uses generated word counts of 100/200/350/650
  to meet the requested pacing without changing the pure engine contract.
- Vercel deployment protection remains enabled; it is independent of the app
  build and can be verified through the authenticated deployment check.
- No extra progress bar was added because the large timer and accent treatment
  read more clearly in the existing card at narrow widths.
