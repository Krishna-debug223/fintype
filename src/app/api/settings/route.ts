import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/config";
import { getDatabase } from "@/server/db";
import { jsonError, jsonOk } from "@/server/http";
import { userSettings } from "../../../../db/schema";

const lengthSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("time"),
    seconds: z.union([15, 30, 60, 120].map((value) => z.literal(value))),
  }),
  z.object({
    type: z.literal("words"),
    words: z.union([25, 50, 100].map((value) => z.literal(value))),
  }),
]);

const settingsSchema = z.object({
  theme: z.enum(["dark", "light", "terminal", "wallstreet"]),
  fontSize: z.enum(["small", "medium", "large", "xl"]),
  caretStyle: z.enum(["line", "block", "underline"]),
  smoothCaret: z.boolean(),
  showLiveWpm: z.boolean(),
  showLiveAccuracy: z.boolean(),
  showTimer: z.boolean(),
  defaultMode: z.enum([
    "terms",
    "office",
    "numbers",
    "excel",
    "mixed",
    "daily",
    "custom",
  ]),
  defaultLength: lengthSchema,
  difficulty: z.enum(["easy", "medium", "hard"]),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  stopOnError: z.boolean(),
  confidenceMode: z.boolean(),
  quickRestartKey: z.enum(["tab-enter", "escape"]),
  blindMode: z.boolean(),
  reducedMotion: z.enum(["system", "on", "off"]),
  highContrast: z.boolean(),
  largerCaret: z.boolean(),
});

export async function GET() {
  if (!isDatabaseConfigured())
    return jsonOk({ configured: false, settings: null });
  const user = await requireUser();
  if (!user)
    return jsonError("UNAUTHENTICATED", "Sign in to sync settings.", 401);
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const rows = await database
    .select({
      settings: userSettings.settings,
      updatedAt: userSettings.updatedAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .limit(1);
  return jsonOk({ configured: true, settings: rows[0] ?? null });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured())
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const user = await requireUser();
  if (!user)
    return jsonError("UNAUTHENTICATED", "Sign in to sync settings.", 401);
  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return jsonError("INVALID_SETTINGS", "Settings are invalid.", 400);
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const rows = await database
    .insert(userSettings)
    .values({ userId: user.id, settings: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings: parsed.data, updatedAt: new Date() },
    })
    .returning({
      settings: userSettings.settings,
      updatedAt: userSettings.updatedAt,
    });
  return jsonOk({ settings: rows[0] });
}
