import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

import { getDatabase } from "./db";
import { getAdminEmails, getAppUrl, isAuthConfigured } from "./config";

const database = getDatabase();
const providers: NextAuthOptions["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.AUTH_RESEND_KEY,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || "fintype-local-development-secret",
  providers,
  ...(database ? { adapter: DrizzleAdapter(database) } : {}),
  session: { strategy: database ? "database" : "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token.sub ?? "";
      }
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isAuthConfigured() || providers.length === 0) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (
    !user ||
    !user.email ||
    !getAdminEmails().includes(user.email.toLowerCase())
  )
    return null;
  return user;
}

export function authRedirectUrl(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
