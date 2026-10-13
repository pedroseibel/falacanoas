import { prescreen, refusalFor, refusedInUpdates, type EvidenceAction, type Item } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ActionInputSchema,
  readActionFormData,
  refusalMessage,
  toItemAction,
  type ActionInput,
} from "@/features/item/item-actions-model";
import { actOnItem, setFollowing, viewerOf, type ViewerState } from "./items";
import { member, type Failure } from "./member";
import { markNickPublished } from "./nicks";
import { formData, keepPhotos, PHOTO_ERROR } from "./photo-intake";
import { notifyFollowers } from "./push-send";
import { removePhotos } from "./photos";
import { getSession } from "./session";
import { recordEvidence } from "./vault";

/**
 * The item page's writes (DECISIONS rounds 4 and 15): structured actions, each appended to the
 * item's history, and following. Reading never needs an account; acting needs nível 1.
 */

export type ActResult = Failure | { ok: true; item: Item; viewer: ViewerState };

const EVIDENCE: Record<ActionInput["type"], EvidenceAction> = {
  confirm: "confirmation",
  still: "confirmation",
  resolved: "confirmation",
  update: "comment",
  photo: "publication",
};

/** What the signed-in neighbour has already done here; null when nobody is signed in at nível 1. */
export const getItemViewer = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().min(4).max(12).parse(id.toUpperCase()))
  .handler(async ({ data }): Promise<ViewerState | null> => {
    const user = (await getSession())?.user;
    if (!user || user.isAnonymous || !user.phoneVerifiedAt) return null;
    return viewerOf(data, user.id, user.phoneVerifiedAt);
  });

export const actOnItemFn = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<ActResult> => {
    const who = await member("participar");
    if ("error" in who) return who;
    const parsed = ActionInputSchema.safeParse(readActionFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o que você enviou." };
    const input = parsed.data;
    if (input.type === "update") {
      const refused = refusedInUpdates(prescreen(input.text, { electoral: false }));
      if (refused.length) return { ok: false, error: refusalFor(refused) };
    }
    const files = input.type === "resolved" || input.type === "photo" ? input.photos : [];
    const photos = files.length ? await keepPhotos(files) : { keys: [], srcs: [] };
    if (!photos) return { ok: false, error: PHOTO_ERROR };

    const out = await actOnItem({
      id: input.id,
      accountId: who.id,
      by: who.nick,
      phoneVerifiedAt: who.phoneVerifiedAt,
      action: toItemAction(input, photos.srcs),
      now: new Date(),
    }).catch(async (e: unknown) => {
      await removePhotos(photos.keys);
      throw e;
    });
    if (!out.ok) {
      await removePhotos(photos.keys);
      const viewer = await viewerOf(input.id, who.id, who.phoneVerifiedAt);
      return { ok: false, error: refusalMessage(out.reason, input.type, viewer?.countsFrom ?? null) };
    }
    await markNickPublished(who.id);
    await recordEvidence(EVIDENCE[input.type], who.id, input.id);
    // The pin's followers hear of news (round 15); confirmations and "continua acontecendo" stay quiet.
    if (input.type === "update") notifyFollowers(out.item, who.id, { kind: "update", text: input.text });
    if (input.type === "photo") notifyFollowers(out.item, who.id, { kind: "photo" });
    if (input.type === "resolved" && out.item.community === "resolved")
      notifyFollowers(out.item, who.id, { kind: "resolved" });
    return out;
  });

export const followItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(4).max(12), on: z.boolean() }))
  .handler(async ({ data }): Promise<Failure | { ok: true; following: boolean }> => {
    const who = await member("acompanhar");
    if ("error" in who) return who;
    return { ok: true, following: await setFollowing(data.id, who.id, data.on) };
  });
