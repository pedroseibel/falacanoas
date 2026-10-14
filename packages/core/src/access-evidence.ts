import { z } from "zod";

/**
 * Access evidence (DECISIONS round 18, Q21-Q23; Marco Civil art. 15, Decreto 8.771 art. 15-A): who
 * connected, from where, for each sign-in, publication, confirmation, comment and guest pin. Never
 * for reads. Kept 6 months, then deleted, unless a valid preservation request holds it.
 *
 * Evidence ties a connection to an action; it doesn't prove who someone is (an IP can be shared).
 */

export const EvidenceActionSchema = z.enum([
  "sign_in",
  "publication",
  "confirmation",
  "comment",
  "guest_pin",
  "account_closed",
  "phone_changed",
]);
export type EvidenceAction = z.infer<typeof EvidenceActionSchema>;

/**
 * The connection, as Cloudflare saw it. In production a Transform Rule copies `cf.edge.client_port`,
 * `cf.edge.server_ip`, `cf.edge.server_port` and `cf.edge.client_tcp` into these request headers,
 * overwriting anything the client sent under the same names; until that rule exists (BUILD 4.5) they
 * are null.
 */
export const EVIDENCE_HEADERS = {
  clientPort: "x-fala-client-port",
  edgeIp: "x-fala-edge-ip",
  edgePort: "x-fala-edge-port",
  clientTcp: "x-fala-client-tcp",
} satisfies Record<string, string>;

export const ConnectionSchema = z.object({
  clientIp: z.string().max(64).nullable(),
  clientPort: z.number().int().min(0).max(65535).nullable(),
  ipVersion: z.union([z.literal(4), z.literal(6)]).nullable(),
  edgeIp: z.string().max(64).nullable(),
  edgePort: z.number().int().min(0).max(65535).nullable(),
  /**
   * "tcp" for HTTP/1.1 and HTTP/2, "quic" for HTTP/3. "whatsapp" when the action came through the
   * project's WhatsApp number: the person's connection is WhatsApp's to log, so the evidence holds the
   * account and the time, with no address.
   */
  transport: z.enum(["tcp", "quic", "whatsapp"]).nullable(),
  /** For correlation only: Ray IDs can repeat. */
  cfRay: z.string().max(64).nullable(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

/** An action sent from the project's WhatsApp number (whatsapp-report.ts). */
export const WHATSAPP_CONNECTION: Connection = {
  clientIp: null,
  clientPort: null,
  ipVersion: null,
  edgeIp: null,
  edgePort: null,
  transport: "whatsapp",
  cfRay: null,
};

const port = (v: string | null) => {
  if (!v || !/^\d{1,5}$/.test(v)) return null;
  const n = Number(v);
  return n <= 65535 ? n : null;
};

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:.]+$/i;

/** Reads only headers Cloudflare sets; anything else a client can forge. */
export function connectionFromHeaders(h: Pick<Headers, "get">): Connection {
  const ip = h.get("cf-connecting-ip")?.trim() || null;
  const tcp = h.get(EVIDENCE_HEADERS.clientTcp);
  return {
    clientIp: ip,
    clientPort: port(h.get(EVIDENCE_HEADERS.clientPort)),
    ipVersion: !ip ? null : IPV4.test(ip) ? 4 : ip.includes(":") && IPV6.test(ip) ? 6 : null,
    edgeIp: h.get(EVIDENCE_HEADERS.edgeIp)?.trim() || null,
    edgePort: port(h.get(EVIDENCE_HEADERS.edgePort)),
    transport: tcp === "true" || tcp === "1" ? "tcp" : tcp === "false" || tcp === "0" ? "quic" : null,
    cfRay: h.get("cf-ray")?.trim() || null,
  };
}

/** Evidence older than this is deleted, unless a hold covers it: 6 calendar months (art. 15). */
export function evidenceCutoff(now: Date): Date {
  const cut = new Date(now);
  cut.setUTCMonth(cut.getUTCMonth() - 6);
  return cut;
}

/** A preservation request lapses if no court order is sought within this many days (art. 15 §2 → art. 13 §§3-4). */
export const HOLD_LAPSE_DAYS = 60;

export interface PreservationHold {
  requestedAt: Date;
  /** When the authority sought the court order; null while it hasn't. */
  courtOrderSoughtAt: Date | null;
  /** The court refused the order. */
  refusedAt: Date | null;
  /** The end the order or request set, if any. */
  endsAt: Date | null;
  releasedAt: Date | null;
}

/**
 * Whether a hold still suspends deletion at `now`. It lapses after 60 days without a court order, ends
 * when refused, released or past its end, and never becomes indefinite on an administrative request.
 */
export function holdActive(h: PreservationHold, now: Date): boolean {
  if (h.requestedAt > now || h.releasedAt || h.refusedAt) return false;
  if (h.endsAt && h.endsAt <= now) return false;
  if (h.courtOrderSoughtAt) return true;
  return now.getTime() - h.requestedAt.getTime() < HOLD_LAPSE_DAYS * 864e5;
}
