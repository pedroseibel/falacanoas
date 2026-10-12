import { QueueSignupSchema, confirmationCode, normalizeContact } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { queueSignups } from "./db/schema";

/**
 * The landing page queue (rounds 6, 12 and 17), stored in Supabase. A bairro's count includes only
 * confirmed sign-ups. No WhatsApp number or e-mail sender exists yet (BUILD.md 3.1, 3.2), so nothing is
 * delivered: the sign-up is kept, and the done screen says the confirmation message comes later.
 */
export const getQueue = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db
    .select({ neighborhood: queueSignups.neighborhood, confirmed: count() })
    .from(queueSignups)
    .where(isNotNull(queueSignups.confirmedAt))
    .groupBy(queueSignups.neighborhood);
  const confirmed: Record<string, number> = Object.fromEntries(rows.map((r) => [r.neighborhood, r.confirmed]));
  return { confirmed, live: true };
});

export const joinQueue = createServerFn({ method: "POST" })
  .inputValidator(QueueSignupSchema)
  .handler(async ({ data }) => {
    if (!canoas.neighborhoods.some((n) => n.slug === data.neighborhood)) throw new Error("Bairro desconhecido.");
    const contact = normalizeContact(data.channel, data.contact);
    const fresh = {
      neighborhood: data.neighborhood,
      channel: data.channel,
      help: data.help,
      code: confirmationCode(crypto.getRandomValues(new Uint32Array(4))),
    };
    // A repeat sign-up updates the row only while it is unconfirmed: nobody can move someone else's
    // confirmed sign-up to another bairro by typing their contact.
    await db
      .insert(queueSignups)
      .values({ ...fresh, contact })
      .onConflictDoUpdate({
        target: queueSignups.contact,
        set: { ...fresh, updatedAt: sql`now()` },
        setWhere: isNull(queueSignups.confirmedAt),
      });
    const [row] = await db
      .select({ code: queueSignups.code, confirmedAt: queueSignups.confirmedAt })
      .from(queueSignups)
      .where(eq(queueSignups.contact, contact));
    return {
      code: row?.code ?? fresh.code,
      saved: true,
      alreadyConfirmed: Boolean(row?.confirmedAt),
      /** A confirmation message or link actually went out. False until a sender exists. */
      delivered: false,
      /** The project's WhatsApp number (digits with country code), once there is one. */
      whatsappNumber: null,
    };
  });
