import { and, desc, eq } from "drizzle-orm";

import { requireAdmin } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { tests, profiles } from "../../../../../db/schema";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("FORBIDDEN", "Admin access is required.", 403);
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const rows = await database
    .select({ test: tests, username: profiles.username })
    .from(tests)
    .leftJoin(profiles, eq(profiles.userId, tests.userId))
    .where(and(eq(tests.validationStatus, "flagged")))
    .orderBy(desc(tests.createdAt))
    .limit(100);
  return jsonOk({ rows });
}
