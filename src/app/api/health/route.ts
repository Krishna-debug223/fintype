import { sql } from "drizzle-orm";

import { jsonError, jsonOk } from "@/server/http";
import { getDatabase } from "@/server/db";
import { accountFeatureStatus } from "@/server/config";

export async function GET() {
  const status = accountFeatureStatus();
  if (!status.database) {
    return jsonOk({
      status: "not_configured",
      database: false,
      features: status,
    });
  }
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    await database.execute(sql`select 1`);
    return jsonOk({ status: "ok", database: true, features: status });
  } catch {
    return jsonError(
      "DATABASE_UNAVAILABLE",
      "Database health check failed.",
      503,
    );
  }
}
