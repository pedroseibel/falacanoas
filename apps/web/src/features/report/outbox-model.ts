import { FloodNotesSchema, ReportFieldsSchema } from "@fala/core";
import { z } from "zod";

/**
 * The report form's outbox, without the browser: a member's report is kept on the phone before it's
 * sent, so a dropped connection loses nothing. The phone retries on its own, backing off; a report the
 * server refuses waits for the person to decide. The key goes with every send, so a retry after a lost
 * response gets the same pin back (server/report-store.ts).
 */

export const DraftSchema = z.object({
  key: z.uuid(),
  // Drafts kept before the flooding questions existed have none.
  fields: ReportFieldsSchema.omit({ photos: true }).extend({ flooding: FloodNotesSchema.default({}) }),
  /** The photos as prepared on the phone (already re-encoded, without metadata). */
  photos: z.array(z.instanceof(Blob)),
  createdAt: z.number(),
  attempts: z.number().int().nonnegative(),
  /** Epoch ms of the next try. */
  nextAt: z.number(),
  /** The server's refusal: no more automatic tries. */
  refused: z.string().nullable(),
});
export type Draft = z.infer<typeof DraftSchema>;

/** The form's own send gets this long before the background can try the same report. */
export const FORM_GRACE_MS = 2 * 60_000;
/** A send that hasn't finished in this long is given up and retried later. */
export const SEND_TIMEOUT_MS = 2 * 60_000;
const RETRY_MS = [10_000, 30_000, 60_000, 2 * 60_000, 5 * 60_000, 15 * 60_000];

/** 10 s after the first failure, then longer, up to 15 minutes between tries. */
export const retryDelay = (attempts: number) =>
  RETRY_MS[Math.min(Math.max(attempts, 1), RETRY_MS.length) - 1] ?? 15 * 60_000;

export const afterFailure = (d: Draft, now: number): Draft => ({
  ...d,
  attempts: d.attempts + 1,
  nextAt: now + retryDelay(d.attempts + 1),
});

/** Ready to try now, oldest first. */
export const due = (drafts: Draft[], now: number) =>
  drafts.filter((d) => !d.refused && d.nextAt <= now).toSorted((a, b) => a.createdAt - b.createdAt);

export const nextTry = (drafts: Draft[]) => {
  const times = drafts.filter((d) => !d.refused).map((d) => d.nextAt);
  return times.length ? Math.min(...times) : null;
};

/** Kept, but still in the form's first send: nothing to say about it yet. */
export const waiting = (drafts: Draft[], now: number) =>
  drafts.filter((d) => d.refused || d.attempts > 0 || d.nextAt <= now);

/** What the person reads about the reports kept on the phone; null when there are none. */
export function outboxLine(all: Draft[], now: number): { text: string; refused: Draft | null } | null {
  const drafts = waiting(all, now);
  const refused = drafts.find((d) => d.refused) ?? null;
  if (refused) return { text: `Não deu para publicar um registro guardado: ${refused.refused}`, refused };
  if (!drafts.length) return null;
  return {
    text:
      drafts.length === 1
        ? "1 registro guardado neste celular. Ele vai ser enviado quando a conexão voltar."
        : `${drafts.length} registros guardados neste celular. Eles vão ser enviados quando a conexão voltar.`,
    refused: null,
  };
}
