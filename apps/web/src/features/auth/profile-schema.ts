import { NickSchema } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";

/**
 * The public face of an account (apelido and bairro) and the two declarations round 18 requires
 * (Q30): 18 or older, and the privacy notice read. Shared by the form and the server function.
 */
export const ProfileSchema = z.object({
  nick: NickSchema,
  neighborhood: z
    .string()
    .refine((slug) => canoas.neighborhoods.some((n) => n.slug === slug), "Escolha um bairro de Canoas."),
  adult: z.boolean().refine((v) => v, "Para entrar, é preciso ter 18 anos ou mais."),
  privacyRead: z.boolean().refine((v) => v, "Confirme que leu o aviso de privacidade."),
});
export type Profile = z.infer<typeof ProfileSchema>;
