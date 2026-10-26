import { itemRain, rainWindow, type Item, type RainDay } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, gte, lt } from "drizzle-orm";
import type { Db } from "./db/client";
import { rainReadings } from "./db/schema";

/**
 * The day's rain beside a flooding record (BUILD 6.3; core rain.ts), from the archive apps/digest
 * keeps: the record's local day, every gauge, then the nearest that measured. Null when the type
 * doesn't ask it, the record has no point, or no gauge near it measured that day.
 */
export async function rainForItem(q: Pick<Db, "select">, item: Item): Promise<RainDay | null> {
  const w = rainWindow(canoas, item);
  if (!w) return null;
  const rows = await q
    .select({ gauge: rainReadings.gauge, observedAt: rainReadings.observedAt, acc24: rainReadings.acc24h })
    .from(rainReadings)
    .where(and(gte(rainReadings.observedAt, w.from), lt(rainReadings.observedAt, w.to)));
  return itemRain(canoas, item, rows);
}
