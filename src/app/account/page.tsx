import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/components/account/profile-form";
import { PageFrame } from "@/components/layout/page-frame";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/config";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  const configured = isDatabaseConfigured();
  return (
    <PageFrame
      eyebrow="Account"
      title={
        user
          ? `Welcome back, ${user.name ?? "typist"}.`
          : "Your account, your record."
      }
      description="Verified results, profile privacy, and cross-device settings live behind the optional account layer."
    >
      {!configured ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Accounts are not configured</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            This deployment is running in local-first mode. Add the database and
            authentication variables from SETUP.md to enable profiles and sync.
          </p>
        </Card>
      ) : !user ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Sign in to continue</h2>
          <Link
            className="mt-4 inline-flex text-accent underline"
            href="/signin"
          >
            Open sign in
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
              Signed in as
            </p>
            <p className="mt-3 text-lg font-semibold">
              {user.email ?? user.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              Your verified submissions are tied to this account.
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              Manage your FinType record
            </h2>
            <ProfileForm />
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="text-accent underline" href="/settings">
                Preferences and sync
              </Link>
              <Link className="text-accent underline" href="/leaderboard">
                Verified leaderboards
              </Link>
              <Link className="text-accent underline" href="/api/profile">
                Profile API
              </Link>
            </div>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}
