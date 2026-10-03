# FinType content

## Current pools

Content version **2** uses seeded shuffle-and-draw generation. The checked-in
pool sizes are available with `pnpm content:stats`; the current release ships
more than 1,800 finance terms (including 400+ symbols), more than 900 office
lines, 720 procedural number tokens, and 400+ Excel formulas. A test consumes a
shuffled pool sequentially, so it never repeats an item until the filtered pool
is exhausted. A 40-item recent window prevents a boundary repeat when a pool
must be reshuffled.

Difficulty filtering starts at the requested tier and tops up from the next
tier when necessary. Mixed mode rotates its Terms, Office, Numbers, and Excel
queues and never places more than three adjacent items from one sub-pool.

## Versioning

`CONTENT_VERSION` is part of every new saved test and server submission. Bump
it whenever a pool, difficulty weight, ordering rule, or generation algorithm
would change the output for an existing seed. Version 1 is frozen in
`src/content/legacy/v1`; existing records without a version migrate to v1.
Retries, history analysis, daily records, and server replay use the record's
own version. Today's daily challenge uses the current version.

Excel generation uses deterministic templates for SUM, AVERAGE, IF, VLOOKUP,
XLOOKUP, INDEX/MATCH, SUMIFS, NPV, IRR, EOMONTH, IFERROR, and SUMPRODUCT. Cell
references and sheet names come from the seeded RNG, and formulas are emitted
without spaces.

## Quality checks

The content generator is framework-free and deterministic: it does not use
`Math.random`, `Date.now`, locale-dependent formatting, or browser APIs.
`pnpm content:stats` prints pool sizes and a repeat simulation. The unit suite
also covers v1 golden replay, v2 determinism, ASCII/formula validity, pool
minimums, and repeat-rate behavior for timed tests.
