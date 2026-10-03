# FinType database

The database is optional. The app remains local-first when `DATABASE_URL` is not set; API routes return a structured `NOT_CONFIGURED` response and the guest typing flow is unaffected.

## Local workflow

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

`pnpm db:reset` drops and recreates the local volume before applying migrations. The seed command refuses to run when `NODE_ENV=production`.

## Tables and query strategy

- Auth.js tables (`users`, `accounts`, `sessions`, `verification_tokens`) own identity and sessions.
- `profiles` stores the public username, privacy, display, and plan controls.
- `tests` stores server-replayed results and validation state. Keystroke logs are JSON for portability and can be removed from older rows later.
- `personal_bests` has one row per user/bucket and is the efficient source for all-time boards.
- `daily_results` has one row per user/UTC date and is the source for daily boards.
- `user_stats` is a write-through aggregate for profile and stats pages.
- `user_settings` stores the validated settings JSON with `updated_at` for last-write-wins sync.
- `audit_log` records security, validation, admin, and account lifecycle actions without raw keystroke bodies.
- `user_bans` hides a user from boards and blocks future submissions while preserving their private history.

All leaderboard candidates are filtered by validation status, eligibility, privacy, and active bans before ranking. The composite `tests_leaderboard_idx`, `personal_bests_board_idx`, and `daily_results_board_idx` indexes cover the filter/order columns; production deployments should confirm with `EXPLAIN (ANALYZE, BUFFERS)` after loading representative data. The intended query uses `row_number() over (partition by user_id order by wpm desc, accuracy desc, achieved_at asc)` so each user contributes one best row without N+1 lookups.
