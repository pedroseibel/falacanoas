import { NickSchema } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";

/** The public face of an account: apelido and bairro. Shared by the form and the server function. */
export const ProfileSchema = z.object({
  nick: NickSchema,
  neighborhood: z
    .string()
    .refine((slug) => canoas.neighborhoods.some((n) => n.slug === slug), "Escolha um bairro de Canoas."),
});
export type Profile = z.infer<typeof ProfileSchema>;
