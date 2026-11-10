import { z } from "zod";
import { FloodNotesSchema } from "./flooding";
import { REPORT } from "./report";
import { ItemIdSchema, VisibilitySchema } from "./types";

/**
 * What travels between the WhatsApp service and the app when a member registers by WhatsApp
 * (whatsapp-report.ts holds the conversation): the service posts form fields to
 * /api/whatsapp/registro with a vault assertion, and the app answers in JSON. Both ends parse with
 * these, so a field added on one side is a type error on the other.
 */

/** Development's tokens, when neither .dev.vars sets one: the same on both ends of each call. */
export const DEV_WHATSAPP_APP_TOKEN = "desenvolvimento-whatsapp-app-00000000000000";
export const DEV_WHATSAPP_VAULT_TOKEN = "desenvolvimento-whatsapp-cofre-0000000000";

const Point = { lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) };

/** The request's fields, as the form carries them (every value a string). */
export const WhatsappIntakeSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("conta") }),
  z.object({ acao: z.literal("parecido"), categoria: z.string().max(40), ...Point }),
  z.object({
    acao: z.literal("publicar"),
    categoria: z.string().max(40),
    texto: z.string().max(REPORT.maxText).default(""),
    referencia: z.string().max(REPORT.maxReference).default(""),
    /** The flooding answers, as JSON (form fields are strings). */
    alagamento: z
      .string()
      .default("{}")
      .transform((s, ctx) => {
        try {
          return JSON.parse(s);
        } catch {
          ctx.addIssue({ code: "custom", message: "alagamento" });
          return z.NEVER;
        }
      })
      .pipe(FloodNotesSchema),
    visibilidade: VisibilitySchema,
    ...Point,
  }),
  z.object({ acao: z.literal("somar"), item: ItemIdSchema, visibilidade: VisibilitySchema }),
]);
type Intake = z.input<typeof WhatsappIntakeSchema>;
export type WhatsappIntakeFields<A extends Intake["acao"]> = {
  [K in keyof Extract<Intake, { acao: A }>]: string;
};

/** A refusal: the sentence for the person, and what they should fix on the site, if that is it. */
export const WhatsappRefusalSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  missing: z.enum(["account", "nick"]).optional(),
});
export type WhatsappRefusal = z.infer<typeof WhatsappRefusalSchema>;

export const WhatsappReply = {
  conta: z.union([z.object({ ok: z.literal(true), nick: z.string() }), WhatsappRefusalSchema]),
  parecido: z.object({
    ok: z.literal(true),
    duplicate: z.object({ id: z.string(), meters: z.number(), title: z.string() }).nullable(),
  }),
  publicar: z.union([
    z.object({ ok: z.literal(true), id: z.string(), digest: z.enum(["hoje", "amanhã"]), held: z.boolean() }),
    WhatsappRefusalSchema,
  ]),
  somar: z.union([z.object({ ok: z.literal(true), id: z.string() }), WhatsappRefusalSchema]),
};
export type WhatsappReplyOf<A extends keyof typeof WhatsappReply> = z.infer<(typeof WhatsappReply)[A]>;
