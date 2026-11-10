import { isReadableCode, missingSignups } from "./signup";
import type { Municipality } from "./types";

/**
 * The project's WhatsApp number, from the person's side (DECISIONS rounds 12 and 17): sending the
 * pre-filled "CONFIRMAR XXXX" proves the number and records the opt-in for a bairro's queue, at no
 * cost to the project, since the person writes first. "SAIR" takes the sign-up back out. Anything
 * else gets a short note on what this number does. Plain functions: the service does the I/O.
 */

export type Intent = { kind: "confirm"; code: string } | { kind: "leave" } | { kind: "other" };

/**
 * What a message asks for. "CONFIRMAR" and four characters, however typed; a bare code counts too
 * when it could only be one (all from the code's alphabet, so "SAIR" or "BLZA" are not codes).
 */
export function readIntent(text: string): Intent {
  const t = text.normalize("NFKC").trim();
  if (/^(sair|parar|cancelar|stop|descadastrar)\W*$/i.test(t)) return { kind: "leave" };
  const said = /^confirmar\W*([a-z0-9]{4})\W*$/i.exec(t)?.[1];
  if (said) return { kind: "confirm", code: said.toUpperCase() };
  const bare = /^([a-z0-9]{4})\W*$/i.exec(t)?.[1]?.toUpperCase();
  if (bare && isReadableCode(bare)) return { kind: "confirm", code: bare };
  return { kind: "other" };
}

/**
 * The forms a Brazilian mobile can take as a WhatsApp id. Accounts made before the ninth digit
 * (2012–2016) often still arrive without it: 55 51 8888-7777 for 55 51 98888-7777.
 */
export function whatsappVariants(id: string): string[] {
  const d = id.replace(/\D/g, "");
  if (!d.startsWith("55")) return [d];
  if (d.length === 13 && d.charAt(4) === "9") return [d, d.slice(0, 4) + d.slice(5)];
  if (d.length === 12 && /[6-9]/.test(d.charAt(4))) return [d, `${d.slice(0, 4)}9${d.slice(4)}`];
  return [d];
}

export interface WhatsappSignup {
  neighborhood: string;
  code: string;
  confirmed: boolean;
}

export type Outcome =
  | { kind: "confirmed"; neighborhood: string; confirmedInBairro: number }
  | { kind: "already"; neighborhood: string }
  | { kind: "wrong-code" }
  | { kind: "unknown" }
  | { kind: "left"; neighborhood: string }
  | { kind: "nothing-to-leave" }
  | { kind: "other" };

/** What to do with a confirmation, before the count. Null: confirm it. */
export function judgeConfirmation(
  signup: WhatsappSignup | null,
  code: string,
): Extract<Outcome, { kind: "already" | "wrong-code" | "unknown" }> | null {
  if (!signup) return { kind: "unknown" };
  if (signup.confirmed) return { kind: "already", neighborhood: signup.neighborhood };
  return signup.code === code ? null : { kind: "wrong-code" };
}

/**
 * The answer, in pt-BR. Short: it's read in a chat. `reporting`: the service can register problems
 * (whatsapp-report.ts), so the note on what this number does mentions it.
 */
export function replyFor(outcome: Outcome, muni: Municipality, { reporting = false } = {}): string {
  const site = muni.branding.domain;
  const bairro = (slug: string) => muni.neighborhoods.find((n) => n.slug === slug);
  switch (outcome.kind) {
    case "confirmed": {
      const b = bairro(outcome.neighborhood);
      const missing = missingSignups(b?.threshold ?? null, outcome.confirmedInBairro);
      const name = b?.name ?? outcome.neighborhood;
      return [
        `Pronto, sua inscrição na fila de ${name} está confirmada. Agora você conta.`,
        missing > 0
          ? `${missing === 1 ? "Falta 1 inscrição" : `Faltam ${missing} inscrições`} para o ${muni.branding.name} abrir em ${name}. Chame seus vizinhos: https://${site}/?b=${outcome.neighborhood}`
          : `A fila de ${name} está completa. Avisamos por aqui quando o bairro abrir.`,
        "Para sair da fila, responda SAIR.",
      ].join("\n\n");
    }
    case "already":
      return `Esta inscrição já estava confirmada e continua contando na fila de ${bairro(outcome.neighborhood)?.name ?? outcome.neighborhood}.`;
    case "wrong-code":
      return `Este código não é o da sua inscrição. Confira o código na página onde você se inscreveu, ou inscreva-se de novo em https://${site}.`;
    case "unknown":
      return `Não encontramos uma inscrição para este número. Para entrar na fila do seu bairro, inscreva-se em https://${site}.`;
    case "left":
      return `Pronto, sua inscrição na fila de ${bairro(outcome.neighborhood)?.name ?? outcome.neighborhood} foi apagada. Não mandaremos mais mensagens para este número.`;
    case "nothing-to-leave":
      return "Este número não está em nenhuma fila. Não mandaremos mensagens para ele.";
    case "other":
      return reporting
        ? `Oi! Por este número o ${muni.branding.name} confirma inscrições nas filas dos bairros e registra problemas de quem já tem conta: mande REGISTRAR ou uma foto do problema. Para ver o mapa, use https://${site}. Em emergência: Defesa Civil 199, Bombeiros 193.`
        : `Oi! Por este número o ${muni.branding.name} só confirma inscrições nas filas dos bairros. Para ver ou registrar um problema, use https://${site}. Em emergência: Defesa Civil 199, Bombeiros 193.`;
  }
}
