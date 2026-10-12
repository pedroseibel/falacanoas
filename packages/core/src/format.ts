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
