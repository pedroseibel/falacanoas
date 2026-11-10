import {
  DATA_REQUEST_ACTION,
  type DataRequest,
  DataRequestSchema,
  DAY_MS,
  newProtocol,
  parseItemRef,
} from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { dataRequests, items } from "./db/schema";
import { hashKey } from "./items";
import type { Failure } from "./member";
import { getSession } from "./session";
import { isHuman } from "./vault";

/**
 * The data-subject channel (DECISIONS round 18; LGPD art. 18 and 19): anyone can ask, signed in or
 * not. No document by default; the proof that fits is recorded instead: the session, for an account
 * holder, or a guest pin's secret link, whose key is checked and never stored.
 */

/** Requests a signed-in person can send in a day: enough for real needs, not for flooding. */
const DAILY_PER_ACCOUNT = 5;

type Row = Omit<typeof dataRequests.$inferInsert, "protocol">;

async function insertWithProtocol(row: Row, tries = 3): Promise<string> {
  const protocol = newProtocol(crypto.getRandomValues(new Uint32Array(6)));
  const [saved] = await db
    .insert(dataRequests)
    .values({ ...row, protocol })
    .onConflictDoNothing()
    .returning({ protocol: dataRequests.protocol });
  if (saved) return saved.protocol;
  if (tries <= 1) throw new Error("protocolo repetido");
  return insertWithProtocol(row, tries - 1);
}

/** Whether the secret key opens this pin: the guest's proof that it's theirs. */
async function keyOpens(itemId: string, key: string): Promise<boolean> {
  const [row] = await db.select({ hash: items.trackingKeyHash }).from(items).where(eq(items.id, itemId));
  return Boolean(row?.hash && (await hashKey(key)) === row.hash);
}

export const submitDataRequest = createServerFn({ method: "POST" })
  .validator((input: DataRequest & { turnstile: string | null }) =>
    DataRequestSchema.extend({ turnstile: z.string().max(4096).nullable() }).parse(input),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true; protocol: string }> => {
    const user = (await getSession())?.user;
    const member = user && !user.isAnonymous && user.phoneVerifiedAt ? user : null;
    if (member) {
      const [sent] = await db
        .select({ n: count() })
        .from(dataRequests)
        .where(and(eq(dataRequests.accountId, member.id), gte(dataRequests.createdAt, new Date(Date.now() - DAY_MS))));
      if ((sent?.n ?? 0) >= DAILY_PER_ACCOUNT)
        return { ok: false, error: "Você já mandou vários pedidos hoje. Aguarde a resposta ou escreva amanhã." };
    } else if (!(await isHuman(data.turnstile, DATA_REQUEST_ACTION))) {
      return { ok: false, error: "Não deu para confirmar que o pedido veio de uma pessoa. Tente de novo." };
    }

    // The pin is recorded as given, found or not: the form doesn't reveal which pins exist.
    const ref = data.item ? parseItemRef(data.item) : null;
    const proof =
      ref?.key && (await keyOpens(ref.id, ref.key))
        ? "tracking_key"
        : member && data.requester === "account"
          ? "session"
          : null;
    const protocol = await insertWithProtocol({
      requester: data.requester,
      kind: data.kind,
      itemId: ref?.id ?? null,
      proof,
      text: data.text,
      contact: data.contact,
      accountId: member?.id ?? null,
    });
    return { ok: true, protocol };
  });
