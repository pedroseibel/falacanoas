import { localTime } from "@fala/core";

const pad = (n: number) => String(n).padStart(2, "0");

/** "fala-canoas-meus-dados-2026-10-12.json", dated where the instance is. */
export function exportFileName(now: Date, timezone: string): string {
  const t = localTime(now, timezone);
  return `fala-canoas-meus-dados-${t.year}-${pad(t.month)}-${pad(t.day)}.json`;
}
