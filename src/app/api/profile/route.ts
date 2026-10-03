import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { isDatabaseConfigured } from "@/server/config";
import { jsonError, jsonOk } from "@/server/http";
import { profiles } from "../../../../db/schema";
import { validateUsername } from "@/server/validation";

const profileSchema = z.object({
  username: z.string(),
  displayName: z.string().max(80).nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
  isPublic: z.boolean().optional(),
  showOnLeaderboards: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user)
    return jsonError("UNAUTHENTICATED", "Sign in to view your profile.", 401);
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const rows = await database
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  return jsonOk({ profile: rows[0] ?? null });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured())
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const user = await requireUser();
  if (!user)
    return jsonError("UNAUTHENTICATED", "Sign in to create a profile.", 401);
  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return jsonError("INVALID_PROFILE", "Profile fields are invalid.", 400);
  const validation = validateUsername(parsed.data.username);
  if (!validation.ok)
    return jsonError(
      "INVALID_USERNAME",
      validation.reason ?? "Username is not available.",
      422,
    );
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const existing = await database
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.username, validation.normalized))
    .limit(1);
  if (existing[0] && existing[0].userId !== user.id)
    return jsonError("USERNAME_TAKEN", "That username is already taken.", 409);
  const values = {
    userId: user.id,
    username: validation.normalized,
    displayName: parsed.data.displayName ?? null,
    bio: parsed.data.bio ?? null,
    isPublic: parsed.data.isPublic ?? true,
    showOnLeaderboards: parsed.data.showOnLeaderboards ?? true,
  };
  const profileUpdate = {
    username: values.username,
    displayName: values.displayName,
    bio: values.bio,
    isPublic: values.isPublic,
    showOnLeaderboards: values.showOnLeaderboards,
  };
  const profile = await database
    .insert(profiles)
    .values(values)
    .onConflictDoUpdate({ target: profiles.userId, set: profileUpdate })
    .returning();
  return jsonOk({ profile: profile[0] });
}
