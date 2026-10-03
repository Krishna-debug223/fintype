import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 20 }).notNull(),
    displayName: varchar("display_name", { length: 80 }),
    bio: varchar("bio", { length: 160 }),
    isPublic: boolean("is_public").notNull().default(true),
    showOnLeaderboards: boolean("show_on_leaderboards").notNull().default(true),
    usernameChangedAt: timestamp("username_changed_at", { mode: "date" }),
    plan: text("plan").notNull().default("free"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    usernameLowerUnique: uniqueIndex("profiles_username_lower_uidx").on(
      sql`lower(${table.username})`,
    ),
    usernameShape: check(
      "profiles_username_shape",
      sql`${table.username} ~ '^[a-z0-9_]{3,20}$'`,
    ),
  }),
);

export const tests = pgTable(
  "tests",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    lengthType: text("length_type").notNull(),
    lengthValue: integer("length_value").notNull(),
    difficulty: text("difficulty").notNull(),
    punctuation: boolean("punctuation").notNull(),
    numbers: boolean("numbers").notNull(),
    stopOnError: boolean("stop_on_error").notNull(),
    confidenceMode: boolean("confidence_mode").notNull(),
    contentVersion: integer("content_version").notNull().default(1),
    seed: text("seed").notNull(),
    wpm: numeric("wpm", { precision: 8, scale: 2 }).notNull(),
    rawWpm: numeric("raw_wpm", { precision: 8, scale: 2 }).notNull(),
    accuracy: numeric("accuracy", { precision: 5, scale: 2 }).notNull(),
    consistency: numeric("consistency", { precision: 5, scale: 2 }).notNull(),
    errors: integer("errors").notNull(),
    durationMs: integer("duration_ms").notNull(),
    charBreakdown: jsonb("char_breakdown").notNull(),
    wpmSeries: jsonb("wpm_series").notNull(),
    keystrokeLog: jsonb("keystroke_log"),
    validationStatus: text("validation_status").notNull().default("valid"),
    flagReasons: text("flag_reasons")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    eligibleForLeaderboard: boolean("eligible_for_leaderboard")
      .notNull()
      .default(false),
    isDaily: boolean("is_daily").notNull().default(false),
    dailyDate: date("daily_date"),
    retryOf: uuid("retry_of"),
    clientCreatedAt: timestamp("client_created_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    leaderboardIdx: index("tests_leaderboard_idx").on(
      table.validationStatus,
      table.eligibleForLeaderboard,
      table.mode,
      table.lengthType,
      table.lengthValue,
      table.difficulty,
      table.wpm,
      table.createdAt,
    ),
    userCreatedIdx: index("tests_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    valueChecks: check(
      "tests_value_checks",
      sql`${table.lengthType} in ('time', 'words') and ${table.lengthValue} > 0 and ${table.wpm} >= 0 and ${table.accuracy} between 0 and 100 and ${table.durationMs} >= 0`,
    ),
  }),
);

export const personalBests = pgTable(
  "personal_bests",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    wpm: numeric("wpm", { precision: 8, scale: 2 }).notNull(),
    accuracy: numeric("accuracy", { precision: 5, scale: 2 }).notNull(),
    achievedAt: timestamp("achieved_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.bucket] }),
    boardIdx: index("personal_bests_board_idx").on(
      table.bucket,
      table.wpm,
      table.accuracy,
      table.achievedAt,
    ),
  }),
);

export const dailyResults = pgTable(
  "daily_results",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyDate: date("daily_date").notNull(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    wpm: numeric("wpm", { precision: 8, scale: 2 }).notNull(),
    accuracy: numeric("accuracy", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.dailyDate] }),
    boardIdx: index("daily_results_board_idx").on(
      table.dailyDate,
      table.wpm,
      table.accuracy,
    ),
  }),
);

export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalTests: integer("total_tests").notNull().default(0),
  totalTimeMs: integer("total_time_ms").notNull().default(0),
  bestWpm: numeric("best_wpm", { precision: 8, scale: 2 })
    .notNull()
    .default("0"),
  avgWpm30d: numeric("avg_wpm_30d", { precision: 8, scale: 2 })
    .notNull()
    .default("0"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const userBans = pgTable("user_bans", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  bannedAt: timestamp("banned_at", { mode: "date" }).notNull().defaultNow(),
  liftedAt: timestamp("lifted_at", { mode: "date" }),
});

export const schemaTables = {
  users,
  accounts,
  sessions,
  verificationTokens,
  profiles,
  tests,
  personalBests,
  dailyResults,
  userStats,
  userSettings,
  auditLog,
  userBans,
};
