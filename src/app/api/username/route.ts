import { sql } from "drizzle-orm";

import { getDatabase } from "@/server/db";
import { isDatabaseConfigured } from "@/server/config";
import { jsonError, jsonOk } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { validateUsername } from "@/server/validation";
import { profiles } from "../../../../db/schema";

export async function GET(request: Request) {
  if (!isDatabaseConfigured())
    return jsonOk({ configured: false, available: false });
  const url = new URL(request.url);
  const value = url.searchParams.get("value") ?? "";
  const limit = await checkRateLimit(`username:${value.toLowerCase()}`, 30, 60);
  if (!limit.success)
    return jsonError("RATE_LIMITED", "Too many availability checks.", 429);
  const validation = validateUsername(value);
  if (!validation.ok)
    return jsonOk({
      configured: true,
      available: false,
      reason: validation.reason,
    });
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const existing = await database
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(sql`lower(${profiles.username}) = lower(${validation.normalized})`)
    .limit(1);
  return jsonOk({
    configured: true,
    available: existing.length === 0,
    username: validation.normalized,
  });
}
