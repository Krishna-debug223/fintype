import { sql } from "drizzle-orm";

import { jsonError, jsonOk } from "@/server/http";
import { getDatabase } from "@/server/db";
import { isDatabaseConfigured } from "@/server/config";

export const revalidate = 60;

const modes = new Set(["terms", "office", "numbers", "excel", "mixed"]);
const difficulties = new Set(["easy", "medium", "hard"]);

function mondayUtc(date: Date): Date {
  const value = new Date(date);
  const day = value.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysSinceMonday);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured())
    return jsonOk({ configured: false, rows: [], page: 1, pageSize: 50 });
  const database = getDatabase();
  if (!database)
    return jsonError("NOT_CONFIGURED", "Database is not configured.", 503);
  const url = new URL(request.url);
  const board = url.searchParams.get("board") ?? "all-time";
  const mode = url.searchParams.get("mode");
  const difficulty = url.searchParams.get("difficulty");
  const page = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1),
  );
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  if (board === "daily") {
    const dailyDate =
      url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyDate))
      return jsonError("INVALID_DATE", "Daily date must be YYYY-MM-DD.", 400);
    const rows = await database.execute(sql`
      with best_per_user as (
        select distinct on (d.user_id)
          d.user_id, d.wpm, d.accuracy, d.daily_date, p.username
        from daily_results d
        join profiles p on p.user_id = d.user_id
        left join user_bans b on b.user_id = d.user_id and b.lifted_at is null
        where d.daily_date = ${dailyDate}
          and p.is_public = true
          and p.show_on_leaderboards = true
          and b.user_id is null
        order by d.user_id, d.wpm desc, d.accuracy desc, d.daily_date asc
      ), ranked as (
        select best_per_user.*,
          row_number() over (order by wpm desc, accuracy desc, daily_date asc) as rank
        from best_per_user
      )
      select * from ranked
      order by wpm desc, accuracy desc, daily_date asc
      limit ${pageSize} offset ${offset}
    `);
    return jsonOk({ configured: true, board, dailyDate, rows, page, pageSize });
  }
  const modeFilter =
    mode && modes.has(mode) ? sql`and t.mode = ${mode}` : sql``;
  const difficultyFilter =
    difficulty && difficulties.has(difficulty)
      ? sql`and t.difficulty = ${difficulty}`
      : sql`and t.difficulty in ('medium', 'hard')`;
  const weeklyFilter =
    board === "weekly"
      ? sql`and t.created_at >= ${mondayUtc(new Date())}`
      : sql``;
  const rows = await database.execute(sql`
    with best_per_user as (
      select distinct on (t.user_id)
        t.user_id,
        t.wpm,
        t.accuracy,
        t.created_at,
        t.mode,
        t.length_type,
        t.length_value,
        t.difficulty,
        p.username
      from tests t
      join profiles p on p.user_id = t.user_id
      left join user_bans b on b.user_id = t.user_id and b.lifted_at is null
      where t.validation_status = 'valid'
        and t.eligible_for_leaderboard = true
        and p.is_public = true
        and p.show_on_leaderboards = true
        and b.user_id is null
        ${modeFilter}
        ${difficultyFilter}
        ${weeklyFilter}
      order by t.user_id, t.wpm desc, t.accuracy desc, t.created_at asc
    ), ranked as (
      select best_per_user.*,
        row_number() over (order by wpm desc, accuracy desc, created_at asc) as rank
      from best_per_user
    )
    select * from ranked
    order by wpm desc, accuracy desc, created_at asc
    limit ${pageSize} offset ${offset}
  `);
  return jsonOk({ configured: true, board, rows, page, pageSize });
}
