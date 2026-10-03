import { sql } from "drizzle-orm";

import { getDatabaseUrl } from "../src/server/config";
import { getDatabase } from "../src/server/db";
import { profiles } from "./schema";

if (process.env.NODE_ENV === "production") {
  throw new Error("The demo seed is disabled in production.");
}

const database = getDatabase();
if (!database || !getDatabaseUrl()) {
  console.log("DATABASE_URL is not configured; nothing to seed.");
  process.exit(0);
}

await database.execute(sql`insert into users (id, name, email)
  values ('demo-user', 'FinType Demo', 'demo@example.com')
  on conflict (id) do nothing`);
await database
  .insert(profiles)
  .values({
    userId: "demo-user",
    username: "fintype_demo",
    displayName: "FinType Demo",
  })
  .onConflictDoNothing();
console.log("Seeded the local FinType demo user.");
