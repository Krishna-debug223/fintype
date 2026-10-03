# FinType deployment setup

FinType is local-first by default. A deployment without `DATABASE_URL` or authentication credentials still supports the complete guest typing experience; account routes explain that server features are disabled.

## Local Postgres

1. Copy `.env.example` to `.env.local`.
2. Start Postgres: `docker compose up -d postgres`.
3. Apply the schema: `pnpm db:migrate`.
4. Add `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintype`.
5. Optionally create the demo row with `pnpm db:seed`.
6. Start Next.js with `pnpm dev` and check `/api/health`.

`pnpm db:reset` is intentionally destructive to the local Docker volume. Use it only when you want a clean database.

## Neon

Create a Neon project and use its pooled connection string as `DATABASE_URL`. Apply migrations from a trusted CI or local machine with `pnpm db:migrate`; do not run migrations from a request handler. Neon’s SSL parameters may remain in the connection string. FinType uses the `postgres` driver with prepared statements disabled for pooler compatibility.

## Authentication

Set a long random `AUTH_SECRET`. For Google, create a web OAuth client and register:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_DOMAIN/api/auth/callback/google
```

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Email sign-in is available through Resend SMTP when `AUTH_RESEND_KEY` and `EMAIL_FROM` are present. Set `NEXT_PUBLIC_APP_URL` to the exact public origin so callback and profile links are correct.

`next-auth` is pinned to the stable v4 API in this build. The adapter and schema are Auth.js-compatible, and the provider boundary is isolated in `src/server/auth.ts`.

## Redis rate limits

Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without those variables, API limits use a process-local fallback suitable for development only. Set a private `IP_HASH_SALT` so forwarded IPs can be hashed for abuse logs without storing raw addresses.

## Vercel checklist

- Add every `.env.local` value to the Preview and Production environments.
- Run `pnpm db:migrate` against the production `DATABASE_URL` before promoting the deployment.
- Keep `AUTH_SECRET`, provider secrets, Redis tokens, and `IP_HASH_SALT` out of client-exposed variables.
- Add the production callback URL to the OAuth provider and set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.
- Verify `/api/health`, `/signin`, `/account`, `/leaderboard`, and a signed-in `/api/tests` submission.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The optional server layer is expected to report `configured: false` from `/api/health` when no database is present; that is a healthy local-first state, not an application failure.
