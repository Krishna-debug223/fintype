import { and, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageFrame } from "@/components/layout/page-frame";
import { getDatabase } from "@/server/db";
import { isDatabaseConfigured } from "@/server/config";
import {
  profiles,
  userStats,
  personalBests,
  tests,
} from "../../../../db/schema";

async function loadProfile(username: string) {
  const database = getDatabase();
  if (!database) return null;
  const rows = await database
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.username}) = lower(${username})`)
    .limit(1);
  const profile = rows[0];
  if (!profile) return null;
  if (!profile.isPublic) return { profile, private: true as const };
  const [stats, bests, recent] = await Promise.all([
    database
      .select()
      .from(userStats)
      .where(eq(userStats.userId, profile.userId))
      .limit(1),
    database
      .select()
      .from(personalBests)
      .where(eq(personalBests.userId, profile.userId)),
    database
      .select()
      .from(tests)
      .where(
        and(
          eq(tests.userId, profile.userId),
          eq(tests.validationStatus, "valid"),
        ),
      )
      .orderBy(sql`${tests.createdAt} desc`)
      .limit(10),
  ]);
  return {
    profile,
    private: false as const,
    stats: stats[0] ?? null,
    bests,
    recent,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const loaded = isDatabaseConfigured() ? await loadProfile(username) : null;
  const label = loaded?.profile.username ?? username;
  return {
    title: `${label}'s FinType profile`,
    description: loaded?.private
      ? "This FinType profile is private."
      : `Public FinType typing profile for ${label}.`,
    openGraph: {
      title: `${label} · FinType`,
      description: `Public FinType typing profile for ${label}.`,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!isDatabaseConfigured()) {
    return (
      <PageFrame
        eyebrow="Profile"
        title={`@${username}`}
        description="Public profiles become available when the optional account database is configured."
      >
        <Card className="p-6 text-sm text-muted">
          Accounts are not configured on this deployment.
        </Card>
      </PageFrame>
    );
  }
  const loaded = await loadProfile(username);
  if (!loaded) notFound();
  if (loaded.private) {
    return (
      <PageFrame
        eyebrow="Profile"
        title={`@${loaded.profile.username}`}
        description="This profile is private."
      >
        <Card className="p-6 text-sm text-muted">
          The owner has chosen not to publish profile details.
        </Card>
      </PageFrame>
    );
  }
  const stats = loaded.stats;
  return (
    <PageFrame
      eyebrow="Public profile"
      title={`@${loaded.profile.username}`}
      description={loaded.profile.bio ?? "FinType operator profile."}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <p className="font-mono text-4xl text-accent">
            {stats?.bestWpm ? Math.round(Number(stats.bestWpm)) : "—"}
          </p>
          <p className="mt-2 text-sm text-muted">best verified WPM</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">tests</dt>
              <dd className="font-mono">{stats?.totalTests ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted">time typed</dt>
              <dd className="font-mono">
                {Math.round((stats?.totalTimeMs ?? 0) / 60_000)}m
              </dd>
            </div>
            <div>
              <dt className="text-muted">streak</dt>
              <dd className="font-mono">{stats?.currentStreak ?? 0}d</dd>
            </div>
            <div>
              <dt className="text-muted">joined</dt>
              <dd>{loaded.profile.createdAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Personal bests</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {loaded.bests.map((best) => (
              <div
                className="rounded border border-border p-3"
                key={best.bucket}
              >
                <p className="font-mono text-accent">
                  {Math.round(Number(best.wpm))} WPM
                </p>
                <p className="mt-1 text-xs text-muted">{best.bucket}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold">Recent verified tests</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="pb-2">mode</th>
                <th className="pb-2">WPM</th>
                <th className="pb-2">accuracy</th>
                <th className="pb-2">date</th>
              </tr>
            </thead>
            <tbody>
              {loaded.recent.map((test) => (
                <tr className="border-t border-border" key={test.id}>
                  <td className="py-2">{test.mode}</td>
                  <td className="py-2 font-mono text-accent">
                    {Math.round(Number(test.wpm))}
                  </td>
                  <td className="py-2 font-mono">
                    {Number(test.accuracy).toFixed(1)}%
                  </td>
                  <td className="py-2 text-muted">
                    {test.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageFrame>
  );
}
