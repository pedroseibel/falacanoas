/**
 * Sliding-window limits (DECISIONS round 18, Q16). Pure: callers keep the timestamps (the vault keeps
 * them in its own tables) and ask whether one more hit fits.
 */
export interface Window {
  ms: number;
  max: number;
}

export function admit(hits: number[], now: number, windows: Window[]): { ok: boolean; hits: number[] } {
  const longest = Math.max(...windows.map((w) => w.ms));
  const recent = hits.filter((t) => now - t < longest);
  const ok = windows.every((w) => recent.filter((t) => now - t < w.ms).length < w.max);
  return { ok, hits: ok ? [...recent, now] : recent };
}

const MINUTE = 60_000;

/** Codes per phone number: 3 every 15 minutes, 10 a day. */
export const CODE_WINDOWS: Window[] = [
  { ms: 15 * MINUTE, max: 3 },
  { ms: 24 * 60 * MINUTE, max: 10 },
];

/**
 * Codes per IP address: 10 every 15 minutes. No daily cap: mobile carriers put many people behind
 * one address (CGNAT), so a per-IP day limit would lock out whole neighbourhoods.
 */
export const CODE_WINDOWS_PER_IP: Window[] = [{ ms: 15 * MINUTE, max: 10 }];

/** Code checks per IP address: 20 every 15 minutes (each code also allows only 3 tries). */
export const VERIFY_WINDOWS_PER_IP: Window[] = [{ ms: 15 * MINUTE, max: 20 }];

/**
 * The WhatsApp service asking which account a number belongs to: 40 a day per number (three per
 * report), and 300 every 15 minutes in all, so a leaked service token can't walk the phone book.
 */
export const WHATSAPP_LOOKUP_WINDOWS: Window[] = [{ ms: 24 * 60 * MINUTE, max: 40 }];
export const WHATSAPP_LOOKUP_WINDOWS_ALL: Window[] = [{ ms: 15 * MINUTE, max: 300 }];
