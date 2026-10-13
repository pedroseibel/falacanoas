import {
  applyAction,
  localStamp,
  PhotoFileSchema,
  REPORT,
  UPDATE_MAX,
  type ActionRefusal,
  type Item,
  type ItemAction,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
import type { ViewerState } from "@/server/items";

/**
 * The item page's actions as they travel (FormData, because photos ride along) and the sentences
 * that answer them. Pure, so it's tested without the DOM.
 */

const Id = z.string().min(4).max(12);

export const ActionInputSchema = z.discriminatedUnion("type", [
  z.object({ id: Id, type: z.literal("confirm") }),
  z.object({ id: Id, type: z.literal("still") }),
  z.object({ id: Id, type: z.literal("resolved"), photos: z.array(PhotoFileSchema).max(REPORT.maxPhotos) }),
  z.object({ id: Id, type: z.literal("update"), text: z.string().trim().min(1).max(UPDATE_MAX) }),
  z.object({ id: Id, type: z.literal("photo"), photos: z.array(PhotoFileSchema).min(1).max(REPORT.maxPhotos) }),
]);
export type ActionInput = z.infer<typeof ActionInputSchema>;

/** An action from the item page: the id is the page's. */
export type Act = ActionInput extends infer A ? (A extends { id: string } ? Omit<A, "id"> : never) : never;

/**
 * An action's likely outcome, shown before the server answers: the server's own rules (core's
 * applyAction) on what this neighbour already did with the item. Only for the taps: confirming,
 * "continua", "foi resolvido" without a photo. Text and photos go through screening and moderation,
 * so they wait for the server. The server's copy replaces the guess either way, and a refusal undoes it.
 */
export function predictAction(
  it: Item,
  input: Act,
  viewer: ViewerState,
  ctx: { by: string; now: Date; timezone: string },
): { item: Item; viewer: ViewerState } | null {
  const action: ItemAction | null =
    input.type === "confirm" || input.type === "still"
      ? { type: input.type }
      : input.type === "resolved" && input.photos.length === 0
        ? { type: "resolved", photos: [] }
        : null;
  if (!action) return null;
  const already =
    action.type === "confirm"
      ? viewer.confirmed
      : action.type === "still"
        ? viewer.saidStillToday
        : viewer.saidResolved;
  const out = applyAction(it, action, {
    by: ctx.by,
    author: viewer.author,
    independent: viewer.countsFrom === null,
    already,
    now: ctx.now,
    timezone: ctx.timezone,
  });
  if (!out.ok) return null;
  const did: Partial<ViewerState> =
    action.type === "confirm"
      ? { confirmed: true }
      : action.type === "still"
        ? { saidStillToday: true }
        : { saidResolved: true };
  return { item: out.item, viewer: { ...viewer, ...did } };
}

export function toActionFormData(input: ActionInput): FormData {
  const fd = new FormData();
  fd.set("id", input.id);
  fd.set("type", input.type);
  if (input.type === "update") fd.set("text", input.text);
  if (input.type === "resolved" || input.type === "photo") for (const p of input.photos) fd.append("photo", p);
  return fd;
}

export const readActionFormData = (fd: FormData): unknown => ({
  id: fd.get("id"),
  type: fd.get("type"),
  text: fd.get("text") ?? undefined,
  photos: fd.getAll("photo"),
});

/** The core action, once the server has stored the photos and knows their public paths. */
export function toItemAction(input: ActionInput, photos: string[]): ItemAction {
  switch (input.type) {
    case "update":
      return { type: "update", text: input.text };
    case "resolved":
      return { type: "resolved", photos };
    case "photo":
      return { type: "photo", photos };
    default:
      return { type: input.type };
  }
}

/** "15 out", on the municipality's calendar. */
const day = (iso: string) => localStamp(new Date(iso), canoas.timezone).split(" · ")[0] ?? "";

/** Why an action did nothing, in a sentence that says what to do instead. */
export function refusalMessage(
  reason: ActionRefusal | "gone",
  type: ActionInput["type"],
  countsFrom: string | null,
): string {
  switch (reason) {
    case "closed":
      return "Esse registro já fechou. Se o problema voltou, diga que continua.";
    case "own":
      return "Você registrou este problema; a confirmação precisa vir de outro vizinho.";
    case "too-new":
      return countsFrom
        ? `Sua palavra passa a contar em ${day(countsFrom)}, 72 horas depois de você confirmar o celular.`
        : "Sua palavra passa a contar 72 horas depois de você confirmar o celular.";
    case "already":
      return type === "still"
        ? "Você já disse hoje que continua. Volte amanhã, se continuar."
        : type === "resolved"
          ? "Você já disse que foi resolvido. Falta mais um vizinho, ou 15 dias sem contestação."
          : "Você já confirmou este registro.";
    case "kind":
      return "Essa ação não vale para este tipo de registro.";
    case "empty":
      return type === "update" ? "Escreva a atualização antes de enviar." : "Escolha uma foto antes de enviar.";
    case "gone":
      return "Esse registro não existe mais.";
  }
}

/** What happened, for the toast. */
export const DONE_MESSAGE: Record<ActionInput["type"], string> = {
  confirm: "Confirmado. Obrigado.",
  still: "Registrado: continua acontecendo.",
  resolved: "Registrado. Obrigado por avisar.",
  update: "Atualização publicada no histórico.",
  photo: "Foto enviada. Ela aparece depois que a moderação olhar.",
};
