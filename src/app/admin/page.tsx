import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { Card } from "@/components/ui/card";
import { PageFrame } from "@/components/layout/page-frame";
import { requireAdmin } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { tests, profiles } from "../../../db/schema";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");
  const database = getDatabase();
  const rows = database
    ? await database
        .select({ test: tests, username: profiles.username })
        .from(tests)
        .leftJoin(profiles, eq(profiles.userId, tests.userId))
        .where(eq(tests.validationStatus, "flagged"))
        .orderBy(desc(tests.createdAt))
        .limit(100)
    : [];
  return (
    <PageFrame
      eyebrow="Admin review"
      title="Flagged submissions"
      description="Review anti-cheat flags before a result becomes eligible for rankings."
    >
      {!database ? (
        <Card className="p-6 text-sm text-muted">
          Database is not configured.
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No flagged tests.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ test, username }) => (
            <Card className="p-5" key={test.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-accent">
                    {username ?? test.userId} · {Number(test.wpm).toFixed(1)}{" "}
                    WPM
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {test.flagReasons.join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={`/api/admin/flags/${test.id}`} method="post">
                    <input name="action" type="hidden" value="approve" />
                    <button
                      className="rounded border border-correct px-3 py-2 text-sm text-correct"
                      type="submit"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={`/api/admin/flags/${test.id}`} method="post">
                    <input name="action" type="hidden" value="reject" />
                    <button
                      className="rounded border border-incorrect px-3 py-2 text-sm text-incorrect"
                      type="submit"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
