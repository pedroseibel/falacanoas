import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { db } from "./db/client";

/**
 * The transparency report (DECISIONS round 20; the STF tese on Marco Civil art. 19 asks for an annual
 * one): what moderation did over the last 12 months, counted live from the database, by month on
 * Canoas's calendar. Only counts: never a person, an apelido, a pin or a reason someone typed.
 */

export interface MonthCounts {
  /** "2026-10" */
  month: string;
  photosLooked: number;
  photosRemoved: number;
  reports: number;
  removals: number;
  contests: number;
  contestsWon: number;
  sanctions: number;
  escalations: number;
  dataRequests: number;
}

export interface Transparency {
  months: MonthCounts[];
  totals: Omit<MonthCounts, "month">;
  /** Median hours from a photo's upload to a moderator's first look; null with none decided. */
  medianFirstLookHours: number | null;
  generatedAt: string;
}

const tz = canoas.timezone;
const EMPTY: Omit<MonthCounts, "month"> = {
  photosLooked: 0,
  photosRemoved: 0,
  reports: 0,
  removals: 0,
  contests: 0,
  contestsWon: 0,
  sanctions: 0,
  escalations: 0,
  dataRequests: 0,
};

/** The last 12 months on Canoas's calendar, oldest first: "2025-11" … "2026-10". */
function lastMonths(now: Date): string[] {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).format(now);
  const [y = 0, m = 1] = local.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (11 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

type Key = keyof typeof EMPTY;
const isKey = (k: string): k is Key => k in EMPTY;
const KEYS = Object.keys(EMPTY).filter(isKey);

/** A timestamp column as its month on Canoas's calendar ("2026-10"). Column names are ours, never input. */
const month = (column: string) => sql.raw(`to_char(${column} at time zone '${tz}', 'YYYY-MM')`);

const counts = (key: Key, query: ReturnType<typeof sql>) =>
  db.execute<{ month: string; n: number }>(query).then((r) => r.rows.map((row) => ({ key, ...row })));

export const getTransparency = createServerFn({ method: "GET" }).handler(async (): Promise<Transparency> => {
  const now = new Date();
  const months = lastMonths(now);
  const since = `${months[0]}-01`;
  const after = (column: string) => sql.raw(`${column} at time zone '${tz}' >= '${since}'`);
  const rows = (
    await Promise.all([
      counts(
        "photosLooked",
        sql`select ${month("decided_at")} as month, count(*)::int as n from fala.moderation_cases
             where reason = 'photo' and decided_at is not null and ${after("decided_at")} group by 1`,
      ),
      counts(
        "photosRemoved",
        sql`select ${month("decided_at")} as month, count(*)::int as n from fala.moderation_cases
             where reason = 'photo' and status = 'rejected' and ${after("decided_at")} group by 1`,
      ),
      counts(
        "reports",
        sql`select month, count(*)::int as n from (
              select ${month("created_at")} as month from fala.content_reports where ${after("created_at")}
              union all
              select ${month("created_at")} as month from fala.post_reports where ${after("created_at")}) r
             group by 1`,
      ),
      counts(
        "removals",
        sql`select ${month("decided_at")} as month, count(*)::int as n from fala.moderation_cases
             where status in ('rejected', 'republish') and decided_at is not null and ${after("decided_at")} group by 1`,
      ),
      counts(
        "contests",
        sql`select ${month("contested_at")} as month, count(*)::int as n from fala.moderation_cases
             where contested_at is not null and ${after("contested_at")} group by 1`,
      ),
      counts(
        "contestsWon",
        sql`select ${month("contested_at")} as month, count(*)::int as n from fala.moderation_cases
             where contest_status = 'overturned' and ${after("contested_at")} group by 1`,
      ),
      counts(
        "sanctions",
        sql`select ${month("confirmed_at")} as month, count(*)::int as n from fala.sanctions
             where confirmed_at is not null and ${after("confirmed_at")} group by 1`,
      ),
      counts(
        "escalations",
        sql`select ${month("created_at")} as month, count(*)::int as n from fala.escalations
             where ${after("created_at")} group by 1`,
      ),
      counts(
        "dataRequests",
        sql`select ${month("created_at")} as month, count(*)::int as n from fala.data_requests
             where ${after("created_at")} group by 1`,
      ),
    ])
  ).flat();
  const [median] = (
    await db.execute<{ hours: number | null }>(sql`
      select percentile_cont(0.5) within group (order by extract(epoch from decided_at - created_at) / 3600)::float as hours
        from fala.moderation_cases where reason = 'photo' and decided_at is not null and ${after("decided_at")}`)
  ).rows;

  const byMonth = months.map((m): MonthCounts => {
    const counted = { ...EMPTY };
    for (const r of rows) if (r.month === m) counted[r.key] = r.n;
    return { month: m, ...counted };
  });
  const totals = { ...EMPTY };
  for (const m of byMonth) for (const k of KEYS) totals[k] += m[k];
  return {
    months: byMonth,
    totals,
    medianFirstLookHours: median?.hours ?? null,
    generatedAt: now.toISOString(),
  };
});
