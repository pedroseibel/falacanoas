import { asksFlooding } from "./flooding";
import { itemLngLat } from "./logic";
import { dayRain, localDayBounds, type DayReading, type RainDay } from "./rain";
import type { Item, LngLat, Municipality } from "./types";

/**
 * Which records get the day's rain, and which readings are theirs (BUILD 6.3): a type that asks the
 * flooding questions, on a point, with a registration time. Shared by the record page and the resumo.
 */
export function rainWindow(
  muni: Pick<Municipality, "categories" | "timezone" | "rain">,
  item: Pick<Item, "category" | "scope" | "createdAt">,
): { at: LngLat; from: Date; to: Date } | null {
  if (!muni.rain || !item.createdAt || !asksFlooding(muni, item.category)) return null;
  const at = itemLngLat(item);
  return at ? { at, ...localDayBounds(new Date(item.createdAt), muni.timezone) } : null;
}

/** The day's rain for a record, from any readings that include its day; null when it gets none. */
export function itemRain(
  muni: Pick<Municipality, "categories" | "timezone" | "rain">,
  item: Pick<Item, "category" | "scope" | "createdAt">,
  readings: readonly DayReading[],
): RainDay | null {
  const w = rainWindow(muni, item);
  if (!w || !muni.rain) return null;
  const day = readings.filter((r) => r.observedAt >= w.from && r.observedAt < w.to);
  return dayRain(muni.rain, w.at, day);
}
