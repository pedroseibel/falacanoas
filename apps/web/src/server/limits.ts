/**
 * Sliding-window limits, kept in memory until the database exists (DECISIONS round 18, Q16).
 * Better Auth already limits per IP; these limit per phone number, so a single number can't be used
 * to pump messages from many addresses.
 */
export interface Window {
  ms: number;
  max: number;
}

/** Timestamps still inside the longest window, and whether one more hit fits in every window. */
export function admit(hits: number[], now: number, windows: Window[]): { ok: boolean; hits: number[] } {
  const longest = Math.max(...windows.map((w) => w.ms));
  const recent = hits.filter((t) => now - t < longest);
  const ok = windows.every((w) => recent.filter((t) => now - t < w.ms).length < w.max);
  return { ok, hits: ok ? [...recent, now] : recent };
}

/** Codes per phone number: 3 every 15 minutes, 10 a day. */
export const CODE_WINDOWS: Window[] = [
  { ms: 15 * 60_000, max: 3 },
  { ms: 24 * 3_600_000, max: 10 },
];

const codesByPhone = new Map<string, number[]>();

/** Records a code request for this number; false when it is over the limit. */
export function admitCode(e164: string, now = Date.now()): boolean {
  const r = admit(codesByPhone.get(e164) ?? [], now, CODE_WINDOWS);
  codesByPhone.set(e164, r.hits);
  return r.ok;
}
