import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { getDatabaseUrl } from "../config";
import { schemaTables } from "../../../db/schema";

export type FintypeDatabase = ReturnType<typeof drizzle<typeof schemaTables>>;

let client: ReturnType<typeof postgres> | null = null;
let database: FintypeDatabase | null = null;

/** Return null when DATABASE_URL is absent so guest mode remains fully usable. */
export function getDatabase(): FintypeDatabase | null {
  const url = getDatabaseUrl();
  if (!url) return null;
  client ??= postgres(url, { prepare: false, max: 5 });
  database ??= drizzle(client, { schema: schemaTables });
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (client) await client.end({ timeout: 1 });
  client = null;
  database = null;
}
