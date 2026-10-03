/** Server-only environment helpers. Never import this module from a client component. */

export function getDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET?.trim() &&
    ((process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim()) ||
      (process.env.AUTH_RESEND_KEY?.trim() && process.env.EMAIL_FROM?.trim())),
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function getAdminEmails(): readonly string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function accountFeatureStatus(): {
  database: boolean;
  auth: boolean;
  redis: boolean;
} {
  return {
    database: isDatabaseConfigured(),
    auth: isAuthConfigured(),
    redis: isRedisConfigured(),
  };
}
