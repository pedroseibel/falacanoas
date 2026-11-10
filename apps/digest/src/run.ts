import { buildDigest, localTime, type DigestDocument, type DigestItem, type Municipality } from "@fala/core";
import { createHash } from "node:crypto";

/**
 * One digest run (DECISIONS round 5; BUILD 3.1), apart from Postgres, e-mail and Typst so the rules
 * are tested without them: take the reports not sent yet, number the resumo, lay it out as a PDF,
 * send it as one e-mail, then mark them sent in one transaction. That moment starts each report's
 * public clock. Nothing is marked unless the e-mail went out. A PDF that fails to build doesn't hold
 * the reports back: the e-mail text stands alone, and the run reports what failed.
 */

export interface DigestStore {
  /** Published, real occurrences with no digest yet, oldest first. */
  pending(): Promise<DigestItem[]>;
  /** The next resumo's number in `year` (local time): one more than the year's last. */
  nextNumber(year: number): Promise<number>;
  /** In one transaction: the digest's record, `sent_at` on each item, and the event on each history. */
  markSent(input: {
    sentAt: Date;
    recipients: string[];
    subject: string;
    body: string;
    itemIds: string[];
    transport: string;
    messageId: string | null;
    number: number;
    pdfSha256: string | null;
  }): Promise<void>;
  /** Runs `f` only if no other run holds the lock; null if one does. */
  exclusive<T>(f: () => Promise<T>): Promise<T | null>;
}

interface Attachment {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

export interface Mail {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  attachments: Attachment[];
}

export interface Outbox {
  /** The transport's name ("arquivo" in development). */
  name: string;
  /** Sends; returns the provider's message id, if any. Throws when it didn't go out. */
  send(mail: Mail): Promise<string | null>;
}

export interface Recipients {
  from: string;
  to: string[];
  cc: string[];
}

export type RunResult =
  | { ok: true; sent: number; subject: string | null; pdf?: { bytes: number } | { error: string } }
  | { ok: false; error: "busy" | "send"; detail?: string };

/** "Resumo-diario-0287-2026-Fala-Canoas-2026-10-13.pdf": type, number, sender and day, ASCII only. */
export function pdfName(doc: DigestDocument): string {
  const [n, year] = doc.number.split("/");
  const [d, m, y] = doc.day.split("/");
  const sender = doc.sender
    .normalize("NFD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `Resumo-diario-${n}-${year}-${sender}-${y}-${m}-${d}.pdf`;
}

export async function runDigest(
  deps: {
    store: DigestStore;
    outbox: Outbox;
    muni: Municipality;
    recipients: Recipients;
    /** Lays the resumo out as a PDF; without it, the e-mail goes as text alone. */
    pdf?: (doc: DigestDocument) => Promise<Uint8Array>;
  },
  now = new Date(),
): Promise<RunResult> {
  const { store, outbox, muni, recipients } = deps;
  const result = await store.exclusive(async (): Promise<RunResult> => {
    const items = await store.pending();
    if (!items.length) return { ok: true, sent: 0, subject: null };
    const number = await store.nextNumber(localTime(now, muni.timezone).year);
    let digest = buildDigest(items, muni, now, { sequence: number, attachment: Boolean(deps.pdf) });
    if (!digest.itemIds.length) return { ok: true, sent: 0, subject: null };

    let pdf: Uint8Array | null = null;
    let pdfError: string | null = null;
    if (deps.pdf)
      try {
        pdf = await deps.pdf(digest.document);
      } catch (e) {
        pdfError = String(e);
        digest = buildDigest(items, muni, now, { sequence: number, attachment: false });
      }

    let messageId: string | null;
    try {
      messageId = await outbox.send({
        ...recipients,
        subject: digest.subject,
        text: digest.text,
        attachments: pdf ? [{ filename: pdfName(digest.document), contentType: "application/pdf", content: pdf }] : [],
      });
    } catch (e) {
      return { ok: false, error: "send", detail: String(e) };
    }
    await store.markSent({
      sentAt: now,
      recipients: [...recipients.to, ...recipients.cc],
      subject: digest.subject,
      body: digest.text,
      itemIds: digest.itemIds,
      transport: outbox.name,
      messageId,
      number,
      pdfSha256: pdf ? createHash("sha256").update(pdf).digest("hex") : null,
    });
    return {
      ok: true,
      sent: digest.itemIds.length,
      subject: digest.subject,
      ...(pdf ? { pdf: { bytes: pdf.length } } : pdfError ? { pdf: { error: pdfError } } : {}),
    };
  });
  return result ?? { ok: false, error: "busy" };
}
