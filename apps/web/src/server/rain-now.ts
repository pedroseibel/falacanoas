import { type GaugeNow, gaugesNow, HOUR_MS } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { gte } from "drizzle-orm";
import { db } from "./db/client";
import { rainReadings } from "./db/schema";

export type { GaugeNow };

/**
 * "Chuva agora" (DECISIONS round 23; BUILD 6.6): the instance's gauges from the archive, each with its
 * last hour, its 24 hours and the hours behind them. The browser polls this every 10 minutes while the
 * map shows "Água"; it never reaches Cemaden itself.
 */
export const getRainNow = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ gauges: GaugeNow[]; agency: string; page: string } | null> => {
    const source = canoas.rain;
    if (!source) return null;
    const now = new Date();
    const since = new Date(now.getTime() - 25 * HOUR_MS);
    const rows = await db
      .select({
        gauge: rainReadings.gauge,
        observedAt: rainReadings.observedAt,
        acc1: rainReadings.acc1h,
        acc24: rainReadings.acc24h,
      })
      .from(rainReadings)
      .where(gte(rainReadings.observedAt, since));
    return { gauges: gaugesNow(source, rows, now), agency: source.agency, page: source.page };
  },
);
