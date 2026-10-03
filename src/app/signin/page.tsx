import Link from "next/link";

import { PageFrame } from "@/components/layout/page-frame";
import { Card } from "@/components/ui/card";
import { accountFeatureStatus, getAppUrl } from "@/server/config";

export const metadata = {
  title: "Sign in",
  description: "Sign in to sync FinType history and verified rankings.",
};

export default function SignInPage() {
  const features = accountFeatureStatus();
  const configured = features.database && features.auth;
  return (
    <PageFrame
      eyebrow="Optional account"
      title="Keep your progress across devices."
      description="Guest play remains local and instant. Sign in only when you want sync, verified submissions, profiles, and leaderboards."
    >
      <Card className="mx-auto max-w-lg p-6">
        {!configured ? (
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="font-medium text-foreground">
              Accounts are not configured
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add DATABASE_URL, AUTH_SECRET, and a Google or Resend credential
              to enable sign-in. Nothing is broken: your local history continues
              to work on this device.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <a
              className="block rounded-md bg-accent px-4 py-3 text-center font-medium text-background"
              href={`${getAppUrl()}/api/auth/signin/google`}
            >
              Continue with Google
            </a>
            <p className="text-center text-xs text-muted">
              Or request an email magic link from the Auth.js sign-in screen.
            </p>
            <Link
              className="block text-center text-sm text-accent"
              href="/api/auth/signin"
            >
              Open all sign-in methods
            </Link>
          </div>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          <Link className="text-accent" href="/">
            Continue as a guest
          </Link>
        </p>
      </Card>
    </PageFrame>
  );
}
