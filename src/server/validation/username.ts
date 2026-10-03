import { z } from "zod";

const RESERVED = new Set([
  "admin",
  "api",
  "auth",
  "fintype",
  "finntype",
  "history",
  "leaderboard",
  "settings",
  "support",
  "system",
  "u",
  "user",
]);

// Keep this intentionally small and explainable; moderation can evolve without
// changing the database contract.
const BLOCKED_FRAGMENTS = ["admin", "moderator", "support"] as const;

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/);

export interface UsernameValidation {
  ok: boolean;
  normalized: string;
  reason?: "length" | "characters" | "reserved" | "blocked";
}

export function validateUsername(value: string): UsernameValidation {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 20)
    return { ok: false, normalized, reason: "length" };
  if (!/^[a-z0-9_]+$/.test(normalized))
    return { ok: false, normalized, reason: "characters" };
  if (RESERVED.has(normalized))
    return { ok: false, normalized, reason: "reserved" };
  if (BLOCKED_FRAGMENTS.some((fragment) => normalized.includes(fragment)))
    return { ok: false, normalized, reason: "blocked" };
  return { ok: true, normalized };
}

export function isReservedUsername(value: string): boolean {
  return RESERVED.has(value.trim().toLowerCase());
}
