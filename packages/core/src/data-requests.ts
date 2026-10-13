import { z } from "zod";
import { readableCode } from "./signup";

/**
 * The data-subject channel (DECISIONS round 18, "Data-subject rights"; LGPD art. 18). Anyone can ask,
 * with or without an account: a person in a photo, a guest who posted, a former user who lost access.
 * By default no identity document is asked for; proof stays proportionate to the request.
 */

/** Who is asking, which decides the proof that fits. */
export const RequesterSchema = z.enum(["account", "guest", "in_content", "former", "other"]);
export type Requester = z.infer<typeof RequesterSchema>;

export const REQUESTER_LABEL: Record<Requester, string> = {
  account: "Tenho conta no Fala",
  guest: "Publiquei sem conta",
  in_content: "Apareço num registro ou numa foto",
  former: "Tive conta e perdi o acesso",
  other: "Outro motivo",
};

/** What they want (LGPD art. 18). */
export const RequestKindSchema = z.enum(["access", "copy", "correction", "content", "deletion", "objection", "other"]);
export type RequestKind = z.infer<typeof RequestKindSchema>;

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  access: "Saber quais dados o Fala tem sobre mim",
  copy: "Receber uma cópia dos meus dados",
  correction: "Corrigir um dado",
  content: "Remover ou ocultar um conteúdo",
  deletion: "Apagar os meus dados",
  objection: "Me opor a um uso dos meus dados",
  other: "Outro pedido",
};

/** Days to answer in full (LGPD art. 19, II). */
export const DATA_REQUEST_DAYS = 15;

const ITEM_CODE = /^[A-Za-z0-9]{4,12}$/;

/**
 * A pin's code, or a link to it: "7K3QF", "falacanoas.com.br/o/7K3QF", or a guest's secret link
 * "…/o/7K3QF?chave=…", whose key is the guest's proof that the pin is theirs. Null when it's neither.
 */
export function parseItemRef(input: string): { id: string; key: string | null } | null {
  const s = input.trim();
  if (!s) return null;
  if (ITEM_CODE.test(s)) return { id: s.toUpperCase(), key: null };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://x.invalid/${s.replace(/^\/+/, "")}`);
  } catch {
    return null;
  }
  const m = /\/o\/([A-Za-z0-9]{4,12})\/?$/.exec(url.pathname);
  if (!m?.[1]) return null;
  const key = url.searchParams.get("chave");
  return { id: m[1].toUpperCase(), key: key && key.length <= 64 ? key : null };
}

export const DataRequestSchema = z.object({
  requester: RequesterSchema,
  kind: RequestKindSchema,
  /** A pin's code or link; empty when the request isn't about one. */
  item: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || parseItemRef(v), "Cole o código do registro (ex.: 7K3QF) ou o link dele."),
  text: z
    .string()
    .trim()
    .min(20, "Conte em pelo menos uma frase o que você precisa.")
    .max(2000, "Use até 2.000 caracteres."),
  /** Where the answer goes. */
  contact: z.email("Confira o e-mail: é por ele que vamos responder.").max(254),
});
export type DataRequest = z.infer<typeof DataRequestSchema>;

/** A protocol people can read aloud: "PD-7K3QFA". */
export const newProtocol = (random: ArrayLike<number>) => `PD-${readableCode(random, 6)}`;
