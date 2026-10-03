import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { auditLog, tests, userBans } from "../../../../../../db/schema";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "ban", "unban"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("FORBIDDEN", "Admin access is required.", 403);
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const { id } = await params;
  const input = request.headers.get("content-type")?.includes("form")
    ? Object.fromEntries((await request.formData()).entries())
    : await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success)
    return jsonError("INVALID_ACTION", "Unknown admin action.", 400);
  const row = await database
    .select()
    .from(tests)
    .where(eq(tests.id, id))
    .limit(1);
  const test = row[0];
  if (!test) return jsonError("NOT_FOUND", "Test was not found.", 404);
  const action = parsed.data.action;
  if (action === "approve" || action === "reject") {
    await database
      .update(tests)
      .set({
        validationStatus: action === "approve" ? "valid" : "rejected",
        eligibleForLeaderboard: action === "approve",
      })
      .where(eq(tests.id, id));
  } else if (action === "ban") {
    await database
      .insert(userBans)
      .values({ userId: test.userId, reason: "Admin review" })
      .onConflictDoUpdate({
        target: userBans.userId,
        set: { liftedAt: null, reason: "Admin review" },
      });
  } else {
    await database
      .update(userBans)
      .set({ liftedAt: new Date() })
      .where(eq(userBans.userId, test.userId));
  }
  await database.insert(auditLog).values({
    userId: test.userId,
    action: `admin_${action}`,
    details: { testId: id, adminId: admin.id },
  });
  return jsonOk({ ok: true, action, testId: id });
}
