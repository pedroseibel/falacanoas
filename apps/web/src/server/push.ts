import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { pushSubscriptions } from "./db/schema";
import { member, type Failure } from "./member";

/**
 * This device's notifications (BUILD 4.2): the public key browsers subscribe with, and the
 * subscription itself, stored for the signed-in account. Turning them off here deletes it.
 */

/** The VAPID public key, or null when this instance doesn't send push. */
export const getPushKey = createServerFn({ method: "GET" }).handler(() => process.env.VAPID_PUBLIC_KEY ?? null);

const SubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(80).max(120), auth: z.string().min(16).max(40) }),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .validator(SubscriptionSchema)
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const who = await member("receber avisos");
    if ("error" in who) return who;
    // One row per browser: a browser that changes hands (another account signs in) moves with it.
    await db
      .insert(pushSubscriptions)
      .values({ accountId: who.id, endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { accountId: who.id, p256dh: data.keys.p256dh, auth: data.keys.auth },
      });
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .validator(z.object({ endpoint: z.url().max(1000) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const who = await member("receber avisos");
    if (!("error" in who))
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.endpoint, data.endpoint), eq(pushSubscriptions.accountId, who.id)));
    return { ok: true };
  });
