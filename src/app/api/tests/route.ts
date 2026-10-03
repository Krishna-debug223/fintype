import { headers } from "next/headers";

import { requireUser } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/config";
import { jsonError, jsonOk, hashIp } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { submitForUser } from "@/server/submissions";
import { ANTI_CHEAT } from "@/server/validation";

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
    return jsonError(
      "UNAUTHENTICATED",
      "Sign in to submit verified tests.",
      401,
    );
  const requestHeaders = await headers();
  const ip = hashIp(
    requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? null,
  );
  const [userLimit, ipLimit] = await Promise.all([
    checkRateLimit(`user:${user.id}`, 12, 60),
    checkRateLimit(`ip:${ip ?? "unknown"}`, 40, 60),
  ]);
  if (!userLimit.success || !ipLimit.success) {
    const retryAfter = Math.max(userLimit.retryAfter, ipLimit.retryAfter);
    const response = jsonError(
      "RATE_LIMITED",
      "Too many submissions. Try again shortly.",
      429,
    );
    response.headers.set("retry-after", String(retryAfter));
    return response;
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > ANTI_CHEAT.maxBodyBytes)
    return jsonError(
      "PAYLOAD_TOO_LARGE",
      "Submission payload is too large.",
      413,
    );
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  try {
    const response = await submitForUser(user.id, input);
    if ("error" in response) {
      return jsonError(
        response.error === "invalid-payload"
          ? "INVALID_PAYLOAD"
          : "SUBMISSION_REJECTED",
        response.validation.reasons.join(", ") || "Submission was rejected.",
        response.error === "invalid-payload" ? 400 : 422,
      );
    }
    return jsonOk(response);
  } catch (error) {
    if (error instanceof Error && error.message === "USER_BANNED")
      return jsonError(
        "USER_BANNED",
        "This account cannot submit verified tests.",
        403,
      );
    if (
      error instanceof Error &&
      error.message === "TEST_ID_OWNED_BY_OTHER_USER"
    )
      return jsonError(
        "IDEMPOTENCY_CONFLICT",
        "That test id belongs to another account.",
        409,
      );
    return jsonError(
      "SUBMISSION_FAILED",
      "The submission could not be saved.",
      500,
    );
  }
}
