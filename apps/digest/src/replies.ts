import {
  fullyRead,
  readProtocols,
  replyBody,
  resumoNumberIn,
  type ProtocolReading,
  type ReplyReading,
} from "@fala/core";
import { createHash } from "node:crypto";
import PostalMime from "postal-mime";

/**
 * Answers to the resumo, by e-mail (BUILD 3.1; core protocol-reply.ts). A reply is tied to its resumo
 * by In-Reply-To or References, or by the number in its subject; its own text is read for protocols.
 * What's clear is applied at once, but only from a Prefeitura address, authenticated by our receiving
 * server (or handed in by the operator): a protocol shows on a report's public page with the legal
 * deadline, so a forged reply must not put one there. Everything else waits for a person. Apart from
 * Postgres, so the rules are tested without it.
 */

export interface InboundMail {
  messageId: string;
  /** In-Reply-To and References, without angle brackets. */
  refs: string[];
  from: string;
  subject: string;
  date: Date;
  text: string;
  /** DMARC passed for the From domain, said by our own receiving server (its authserv-id). */
  authenticated: boolean;
}

const bare = (id: string) => id.trim().replace(/^<|>$/g, "");
const domainOf = (address: string) => /@([^>\s]+)>?\s*$/.exec(address)?.[1]?.toLowerCase() ?? "";
const addressOf = (address: string) => /<([^>]+)>/.exec(address)?.[1]?.toLowerCase() ?? address.trim().toLowerCase();

/** An HTML-only reply, as text: enough for the reading (lines kept, tags and entities gone). */
function htmlText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * The topmost Authentication-Results is the one our receiving server added (RFC 8601): those below
 * it came with the message and prove nothing. It must name our server and pass DMARC for the From
 * domain.
 */
export function dmarcPassed(
  headers: { key: string; value: string }[],
  authserv: string | null,
  fromDomain: string,
): boolean {
  if (!authserv || !fromDomain) return false;
  const top = headers.find((h) => h.key === "authentication-results");
  if (!top) return false;
  const [id = "", ...results] = top.value.split(";");
  if (id.trim().split(/\s+/)[0]?.toLowerCase() !== authserv.toLowerCase()) return false;
  const dmarc = results.find((r) => /^\s*dmarc=/i.test(r)) ?? "";
  const from = /header\.from=([^\s;]+)/i.exec(dmarc)?.[1]?.toLowerCase();
  return /^\s*dmarc=pass\b/i.test(dmarc) && from === fromDomain;
}

export async function readMail(raw: string | Uint8Array, authserv: string | null): Promise<InboundMail> {
  const email = await PostalMime.parse(raw);
  const from = email.from && "address" in email.from ? (email.from.address ?? "") : "";
  const date = email.date ? new Date(email.date) : new Date();
  return {
    messageId: email.messageId
      ? bare(email.messageId)
      : `sem-id-${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`,
    refs: `${email.inReplyTo ?? ""} ${email.references ?? ""}`.split(/\s+/).filter(Boolean).map(bare),
    from,
    subject: email.subject ?? "",
    date: Number.isNaN(date.getTime()) ? new Date() : date,
    text: email.text ?? htmlText(email.html ?? ""),
    authenticated: dmarcPassed(email.headers, authserv, domainOf(from)),
  };
}

interface SentResumo {
  id: string;
  itemIds: string[];
}

export type StoredReading = Omit<ReplyReading, "readings"> & { readings: (ProtocolReading & { applied: boolean })[] };

export interface ReplyStore {
  seen(messageId: string): Promise<boolean>;
  resumoFor(refs: string[], number: { number: number; year: number } | null): Promise<SentResumo | null>;
  /** Codes of reports sent lately, to suggest readings for a reply that names no resumo. */
  recentCodes(): Promise<string[]>;
  /**
   * The protocol on these sent reports, with an event in each history; with `keep`, reports that
   * already have one are left alone. Returns the codes written.
   */
  protocol(input: { ids: string[]; number: string; at: Date; by: string; keep: boolean }): Promise<string[]>;
  record(input: {
    mail: InboundMail;
    resumoId: string | null;
    body: string;
    reading: StoredReading;
    trusted: boolean;
    status: "applied" | "review";
  }): Promise<string>;
}

export interface Senders {
  /** The addresses the resumo goes to: replies from their domains may be applied. */
  to: string[];
  cc: string[];
  /** How the history names each: "A Ouvidoria do Município de Canoas". */
  names: { to: string; cc: string[] };
}

/** "A Ouvidoria … registrou o protocolo …": the body the address belongs to, never a person. */
export function senderName(from: string, s: Senders): string {
  const a = addressOf(from);
  if (s.to.some((t) => addressOf(t) === a)) return `A ${s.names.to}`;
  const cc = s.cc.findIndex((c) => addressOf(c) === a);
  return cc >= 0 && s.names.cc[cc] ? `A ${s.names.cc[cc]}` : "A Prefeitura";
}

export type ReplyOutcome =
  | { kind: "repeated" }
  | { kind: "recorded"; id: string; status: "applied" | "review"; applied: string[]; reading: StoredReading };

/** One reply, read, applied as far as it's safe, and recorded. `operator`: handed in by the operator. */
export async function takeReply(
  store: ReplyStore,
  senders: Senders,
  mail: InboundMail,
  { operator = false, now = new Date() }: { operator?: boolean; now?: Date } = {},
): Promise<ReplyOutcome> {
  if (await store.seen(mail.messageId)) return { kind: "repeated" };
  const resumo = await store.resumoFor(mail.refs, resumoNumberIn(mail.subject));
  const body = replyBody(mail.text).slice(0, 20_000);
  const read = readProtocols(body, resumo?.itemIds ?? (await store.recentCodes()));
  const domains = new Set([...senders.to, ...senders.cc].map(domainOf).filter(Boolean));
  const trusted = (operator || mail.authenticated) && domains.has(domainOf(mail.from));
  // The Date header is the sender's word: never later than the moment the reply arrived.
  const at = mail.date > now ? now : mail.date;
  const applied: string[] = [];
  const readings: StoredReading["readings"] = [];
  for (const r of read.readings) {
    const ids = r.codes === "all" ? (resumo?.itemIds ?? []) : r.codes;
    const written =
      resumo && trusted
        ? // oxlint-disable-next-line no-await-in-loop
          await store.protocol({
            ids,
            number: r.number,
            at,
            by: senderName(mail.from, senders),
            keep: r.codes === "all",
          })
        : [];
    applied.push(...written);
    readings.push({ ...r, applied: resumo !== null && trusted });
  }
  const reading: StoredReading = { ...read, readings };
  const status = resumo && trusted && fullyRead(read) ? "applied" : "review";
  const id = await store.record({ mail, resumoId: resumo?.id ?? null, body, reading, trusted, status });
  return { kind: "recorded", id, status, applied, reading };
}
