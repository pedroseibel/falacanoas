export const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function relativeTime(minutes: number): string {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.round(minutes / 60)} h`;
  const d = Math.round(minutes / 1440);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function distance(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function dateAgo(now: Date, days: number): string {
  const d = new Date(now.getTime() - days * 864e5);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
}

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "12 out · 14:20" in the municipality's own clock, as event and photo stamps read. */
export function localStamp(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${Number(part("day"))} ${MONTHS_PT[Number(part("month")) - 1] ?? ""} · ${part("hour")}:${part("minute")}`;
}

/** The hour of the day (0–23) in the municipality's own clock. */
export const localHour = (at: Date, timezone: string) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(at));

export interface LocalTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** The wall-clock reading of an instant in the municipality's timezone. */
export function localTime(at: Date, timezone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}

/** The instant a wall clock in the municipality reads `t`. */
export function zonedDate(t: LocalTime, timezone: string): Date {
  const wall = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
  // The zone's offset at that moment, read back from the formatter; a second pass settles DST edges.
  let at = wall;
  for (let i = 0; i < 2; i++) {
    const seen = localTime(new Date(at), timezone);
    at += wall - Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
  }
  return new Date(at);
}

const dayNumber = (at: Date, timezone: string) => {
  const t = localTime(at, timezone);
  return Date.UTC(t.year, t.month - 1, t.day) / 864e5;
};

/** Calendar days from `from` to `to` on the municipality's calendar: what "43 dias em aberto" counts. */
export const calendarDays = (from: Date, to: Date, timezone: string) =>
  dayNumber(to, timezone) - dayNumber(from, timezone);

/** "hoje · 13:42", "ontem · 19:30" or "30 ago · 17:42": how history and photo stamps read. */
export function eventStamp(at: Date, now: Date, timezone: string): string {
  const stamp = localStamp(at, timezone);
  const days = calendarDays(at, now, timezone);
  const time = stamp.slice(stamp.indexOf(" · "));
  if (days === 0) return `hoje${time}`;
  if (days === 1) return `ontem${time}`;
  return stamp;
}
