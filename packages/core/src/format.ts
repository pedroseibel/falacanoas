const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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
