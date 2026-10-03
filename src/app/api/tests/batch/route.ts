import { headers } from "next/headers";

import { requireUser } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/config";
import { ANTI_CHEAT } from "@/server/validation";
import { hashIp, jsonError, jsonOk } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { submitForUser } from "@/server/submissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured())
    return jsonError(
      "NOT_CONFIGURED",
      "Server accounts are not configured.",
      503,
    );
  const user = await requireUser();
  if (!user)
    return jsonError("UNAUTHENTICATED", "Sign in to sync local tests.", 401);
  const requestHeaders = await headers();
  const ip = hashIp(
    requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? null,
  );
  const [userLimit, ipLimit] = await Promise.all([
    checkRateLimit(`batch-user:${user.id}`, 6, 60),
    checkRateLimit(`batch-ip:${ip ?? "unknown"}`, 20, 60),
  ]);
  if (!userLimit.success || !ipLimit.success) {
    const response = jsonError(
      "RATE_LIMITED",
      "Too many sync batches. Try again shortly.",
      429,
    );
    response.headers.set(
      "retry-after",
      String(Math.max(userLimit.retryAfter, ipLimit.retryAfter)),
    );
    return response;
  }
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > ANTI_CHEAT.maxBodyBytes)
    return jsonError("PAYLOAD_TOO_LARGE", "Sync payload is too large.", 413);
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  if (!Array.isArray(body) || body.length > 100)
    return jsonError(
      "INVALID_BATCH",
      "Batch submissions must contain 1–100 tests.",
      400,
    );
  const results = [];
  for (const item of body) results.push(await submitForUser(user.id, item));
  return jsonOk({ results });
}
