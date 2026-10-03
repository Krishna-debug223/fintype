# Security notes

## Secrets and identity

Only server modules read database, OAuth, Resend, Redis, admin, and IP-hash secrets. Never prefix those values with `NEXT_PUBLIC_`. Rotate `AUTH_SECRET`, provider secrets, and Redis tokens through the hosting provider’s secret manager. Admin access is an explicit lower-cased email allow-list, not a client-side role claim.

## Request boundaries

API routes validate JSON with Zod, cap request bodies and log entries, require a signed-in user for writes, use idempotent test ids, and return a request id for support. User and hashed-IP rate limits protect test and batch submission routes. The app never stores raw forwarded IP addresses.

## Database safety

All writes use Drizzle parameterization or tagged SQL fragments. Foreign keys cascade private user data on account deletion; public profile visibility, leaderboard opt-out, and active bans are applied in every leaderboard query. Run migrations from CI or a trusted operator, not from a web request.

## Browser hardening

`next.config.ts` sets a restrictive baseline for framing, MIME sniffing, referrer leakage, permissions, and production HSTS. The current Content Security Policy allows Next.js’s required inline/eval development behavior; tighten `script-src` for a production nonce/hash rollout before enabling a fully strict CSP.

## Reporting

Do not include secrets, session cookies, or complete keystroke logs in issue reports. Provide the request id, route, timestamp, and a minimal reproduction. For a suspected account or data issue, contact the deployment operator privately and rotate affected credentials first.
