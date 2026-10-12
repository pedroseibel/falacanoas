import { z } from "zod";

/** Where to return after signing in: a path inside this app, never another site and never the sign-in pages. */
export const ReturnPathSchema = z
  .string()
  .max(300)
  .refine((p) => /^\/(?![/\\])/.test(p) && !/^\/(?:entrar|bem-vindo)(?:[/?#]|$)/.test(p));

/** /entrar and /bem-vindo: where the person came from, and what they were doing there. */
export const AuthSearchSchema = z.object({
  volta: ReturnPathSchema.optional().catch(undefined),
  /** Carry on after signing in: "registrar" opens the report form. */
  depois: z.enum(["registrar"]).optional().catch(undefined),
});
export type AuthSearch = z.infer<typeof AuthSearchSchema>;

export const returnPath = (s: AuthSearch) => s.volta ?? "/mapa";

/** Why we're asking, in the page's first line. */
export const REASON: Record<NonNullable<AuthSearch["depois"]>, string> = {
  registrar:
    "Registrar pede um celular confirmado, para cada problema ter um vizinho de verdade por trás. Ler o mapa nunca pede conta.",
};
