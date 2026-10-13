import { buildDigest, type DigestItem, type Municipality } from "@fala/core";

/**
 * One digest run (DECISIONS round 5; BUILD 3.1), apart from Postgres and e-mail so the rules are
 * tested without either: take the reports not sent yet, send them as one e-mail, then mark them
 * sent in one transaction. That moment starts each report's public clock. Nothing is marked unless
 * the e-mail went out.
 */

export interface DigestStore {
  /** Published, real occurrences with no digest yet, oldest first. */
  pending(): Promise<DigestItem[]>;
  /** In one transaction: the digest's record, `sent_at` on each item, and the event on each history. */
  markSent(input: {
    sentAt: Date;
    recipients: string[];
    subject: string;
    body: string;
    itemIds: string[];
    transport: string;
    messageId: string | null;
  }): Promise<void>;
  /** Runs `f` only if no other run holds the lock; null if one does. */
  exclusive<T>(f: () => Promise<T>): Promise<T | null>;
}

export interface Mail {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
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
  { ok: true; sent: number; subject: string | null } | { ok: false; error: "busy" | "send"; detail?: string };

export async function runDigest(
  deps: { store: DigestStore; outbox: Outbox; muni: Municipality; recipients: Recipients },
  now = new Date(),
): Promise<RunResult> {
  const { store, outbox, muni, recipients } = deps;
  const result = await store.exclusive(async (): Promise<RunResult> => {
    const items = await store.pending();
    if (!items.length) return { ok: true, sent: 0, subject: null };
    const digest = buildDigest(items, muni, now);
    if (!digest.itemIds.length) return { ok: true, sent: 0, subject: null };
    let messageId: string | null;
    try {
      messageId = await outbox.send({ ...recipients, subject: digest.subject, text: digest.text });
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
    });
    return { ok: true, sent: digest.itemIds.length, subject: digest.subject };
  });
  return result ?? { ok: false, error: "busy" };
}
