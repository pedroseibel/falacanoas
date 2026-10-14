import { neighborhoodAt } from "./geo";
import { REPORT } from "./report";
import type { LngLat, Municipality } from "./types";

/**
 * Registering a problem from the project's WhatsApp number (DECISIONS round 9: "a reporting bot comes
 * later"; the persona already posts in WhatsApp groups). The same report as the app's form, one question
 * at a time: photos, the place (WhatsApp's location message), the type, a few words, then publish with
 * the apelido or as Anônimo. A similar open problem nearby is offered first, as the form does (round 4).
 * Pure: the WhatsApp service keeps the session, asks the app, and sends the replies.
 */

export type WaMessage =
  | { kind: "text"; text: string }
  | { kind: "image"; mediaId: string; caption?: string }
  | { kind: "location"; lat: number; lng: number };

export type ReportStep = "photos" | "location" | "category" | "text" | "duplicate" | "confirm";

export interface ReportDraft {
  /** The provider's media ids, in the order sent. */
  photos: string[];
  location: LngLat | null;
  category: string | null;
  text: string;
  /** A nearby open problem of the same type, offered before publishing. */
  duplicate: { id: string; meters: number } | null;
}

export interface ReportSession {
  step: ReportStep;
  draft: ReportDraft;
  /** Epoch ms of the last message: a session left alone this long starts over. */
  updatedAt: number;
}

export const REPORT_SESSION_MS = 30 * 60_000;

/** What the service does after a turn: reply, ask the app for a duplicate, publish, or add to one. */
export type ReportNeed =
  | { kind: "check" }
  | { kind: "publish"; visibility: "pseudonymous" | "anonymous" }
  | { kind: "join"; itemId: string; visibility: "pseudonymous" | "anonymous" };

export interface ReportTurn {
  session: ReportSession | null;
  reply: string | null;
  need?: ReportNeed;
}

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[.!?\s]+$/u, "");

/** "REGISTRAR", however typed; or a photo sent on its own starts one too. */
export const startsReport = (msg: WaMessage) =>
  msg.kind === "image" ||
  (msg.kind === "text" && /^(registrar|novo registro|registrar problema)$/.test(norm(msg.text)));

const isCancel = (t: string) => /^(cancelar|cancela|desistir)$/.test(norm(t));
/** During a report, CANCELAR ends it (outside one, the service reads it as leaving a bairro's queue). */
export const cancelsReport = (msg: WaMessage) => msg.kind === "text" && isCancel(msg.text);
const isSkip = (t: string) => /^(pular|pula|nao|sem texto)$/.test(norm(t));
const isDone = (t: string) => /^(pronto|so isso|ok|seguir|proximo)$/.test(norm(t));
const isYes = (t: string) => /^(sim|s|publicar|confirmar)$/.test(norm(t));
const isAnonymous = (t: string) => /^(anonimo|anonima|sem nome)$/.test(norm(t));

/** The types a resident can register here: problems, not questões públicas (those need the app). */
export const whatsappCategories = (muni: Municipality) => muni.categories.filter((c) => c.kind === "occurrence");

const categoryList = (muni: Municipality) =>
  whatsappCategories(muni)
    .map((c, i) => `${i + 1}. ${c.label}`)
    .join("\n");

const HOW_LOCATION =
  "toque no clipe (📎), escolha Localização e envie a sua localização atual, ou marque o ponto do problema no mapa.";
const ASK_LOCATION = `Agora o lugar: ${HOW_LOCATION}`;

const fresh = (now: number): ReportSession => ({
  step: "photos",
  draft: { photos: [], location: null, category: null, text: "", duplicate: null },
  updatedAt: now,
});

const at = (session: ReportSession, now: number, patch: Partial<ReportSession>): ReportSession => ({
  ...session,
  ...patch,
  updatedAt: now,
});

/** The draft, read back before publishing. */
export function summary(draft: ReportDraft, muni: Municipality): string {
  const category = muni.categories.find((c) => c.key === draft.category)?.label ?? "—";
  const bairro = draft.location
    ? muni.neighborhoods.find((n) => n.slug === neighborhoodAt(draft.location ?? [0, 0], muni.geo.neighborhoods))?.name
    : null;
  return [
    `Confira: ${category}${bairro ? ` em ${bairro}` : ""}, ${draft.photos.length === 1 ? "1 foto" : `${draft.photos.length} fotos`}${draft.text ? `, “${draft.text}”` : ""}.`,
    "Responda SIM para publicar com o seu apelido, ou ANÔNIMO para aparecer como Anônimo (a sua conta continua ligada ao registro, para evitar abuso). CANCELAR desiste.",
  ].join("\n\n");
}

/**
 * One message in an ongoing (or new) report. `session` is null when there is none, or it expired.
 * Returns the next session (null when the report ended), the reply, and what the service must do.
 */
export function reportTurn(session: ReportSession | null, msg: WaMessage, muni: Municipality, now: number): ReportTurn {
  const live = session && now - session.updatedAt < REPORT_SESSION_MS ? session : null;
  if (msg.kind === "text" && isCancel(msg.text))
    return {
      session: null,
      reply: live ? "Registro cancelado. Para começar de novo, mande REGISTRAR ou uma foto." : null,
    };
  const s = live ?? (startsReport(msg) ? fresh(now) : null);
  if (!s) return { session: null, reply: null };

  switch (s.step) {
    case "photos": {
      if (msg.kind === "image") {
        if (s.draft.photos.length >= REPORT.maxPhotos)
          return {
            session: at(s, now, { step: "location" }),
            reply: `Já são ${REPORT.maxPhotos} fotos, o máximo por registro. ${ASK_LOCATION}`,
          };
        const photos = [...s.draft.photos, msg.mediaId];
        const text = msg.caption?.trim().slice(0, REPORT.maxText) || s.draft.text;
        // Several photos sent at once arrive as several messages: after the first, a short reply.
        return {
          session: at(s, now, { draft: { ...s.draft, photos, text } }),
          reply:
            photos.length === 1
              ? `Foto recebida. Mande mais fotos (até ${REPORT.maxPhotos}), ou já o lugar: ${HOW_LOCATION}`
              : `${photos.length} fotos. ${photos.length < REPORT.maxPhotos ? "Mande mais, ou o lugar." : "Agora o lugar."}`,
        };
      }
      if (msg.kind === "location") {
        if (!s.draft.photos.length)
          return { session: s, reply: "Primeiro uma foto do problema: ela é obrigatória. Depois, o lugar." };
        return locationTurn(at(s, now, { step: "location" }), msg, muni, now);
      }
      if (isDone(msg.text) && s.draft.photos.length)
        return { session: at(s, now, { step: "location" }), reply: ASK_LOCATION };
      return {
        session: s,
        reply: s.draft.photos.length
          ? ASK_LOCATION
          : "Vamos registrar um problema. Mande uma foto do problema (até 4), mostrando só o problema: sem rostos, placas ou casas.",
      };
    }
    case "location":
      if (msg.kind === "location") return locationTurn(s, msg, muni, now);
      if (msg.kind === "image" && s.draft.photos.length < REPORT.maxPhotos)
        return {
          session: at(s, now, { draft: { ...s.draft, photos: [...s.draft.photos, msg.mediaId] } }),
          reply: `Foto acrescentada. ${ASK_LOCATION}`,
        };
      return { session: s, reply: ASK_LOCATION };
    case "category": {
      const options = whatsappCategories(muni);
      const n = msg.kind === "text" ? Number(norm(msg.text)) : Number.NaN;
      const chosen = Number.isInteger(n) ? options[n - 1] : undefined;
      if (!chosen) return { session: s, reply: `Responda com o número do tipo:\n${categoryList(muni)}` };
      return {
        session: at(s, now, { step: "text", draft: { ...s.draft, category: chosen.key } }),
        reply: s.draft.text
          ? `${chosen.label}. Quer mudar a descrição (“${s.draft.text}”)? Escreva outra, ou responda PULAR para manter.`
          : `${chosen.label}. Quer dizer algo sobre o problema, em poucas palavras (até ${REPORT.maxText} caracteres)? Ou responda PULAR.`,
      };
    }
    case "text": {
      if (msg.kind !== "text") return { session: s, reply: "Escreva em poucas palavras, ou responda PULAR." };
      const text = isSkip(msg.text) ? s.draft.text : msg.text.trim();
      if (text.length > REPORT.maxText)
        return { session: s, reply: `Use no máximo ${REPORT.maxText} caracteres (foram ${text.length}).` };
      // The app looks for a similar open problem nearby before anything is published.
      return { session: at(s, now, { draft: { ...s.draft, text } }), reply: null, need: { kind: "check" } };
    }
    case "duplicate": {
      const choice = msg.kind === "text" ? norm(msg.text) : "";
      const dup = s.draft.duplicate;
      if (choice === "1" && dup) return { session: at(s, now, { step: "confirm" }), reply: joinPrompt() };
      if (choice === "2")
        return {
          session: at(s, now, { step: "confirm", draft: { ...s.draft, duplicate: null } }),
          reply: summary(s.draft, muni),
        };
      return {
        session: s,
        reply: "Responda 1 para somar a sua foto ao registro que já existe, ou 2 se é outro problema.",
      };
    }
    case "confirm": {
      if (msg.kind !== "text" || (!isYes(msg.text) && !isAnonymous(msg.text)))
        return {
          session: s,
          reply: "Responda SIM para publicar com o seu apelido, ANÔNIMO para aparecer como Anônimo, ou CANCELAR.",
        };
      const visibility = isAnonymous(msg.text) ? "anonymous" : "pseudonymous";
      const dup = s.draft.duplicate;
      return {
        session: null,
        reply: null,
        need: dup ? { kind: "join", itemId: dup.id, visibility } : { kind: "publish", visibility },
      };
    }
  }
}

const joinPrompt = () =>
  "Responda SIM para somar a sua foto com o seu apelido, ou ANÔNIMO para somar como Anônimo. CANCELAR desiste.";

function locationTurn(
  s: ReportSession,
  msg: Extract<WaMessage, { kind: "location" }>,
  muni: Municipality,
  now: number,
): ReportTurn {
  const point: LngLat = [msg.lng, msg.lat];
  if (!neighborhoodAt(point, muni.geo.neighborhoods))
    return { session: s, reply: `Esse ponto fica fora de ${muni.name}. Mande a localização do problema.` };
  return {
    session: at(s, now, { step: "category", draft: { ...s.draft, location: point } }),
    reply: `Lugar marcado. Qual é o problema? Responda com o número:\n${categoryList(muni)}`,
  };
}

/** After the app looked for a similar open problem nearby: offer it, or read the draft back. */
export function afterCheck(
  s: ReportSession,
  duplicate: { id: string; meters: number; title: string } | null,
  muni: Municipality,
  now: number,
): ReportTurn {
  if (!duplicate) return { session: at(s, now, { step: "confirm" }), reply: summary(s.draft, muni) };
  return {
    session: at(s, now, {
      step: "duplicate",
      draft: { ...s.draft, duplicate: { id: duplicate.id, meters: duplicate.meters } },
    }),
    reply: [
      `Já existe algo parecido a ${Math.round(duplicate.meters)} m: “${duplicate.title}”, https://${muni.branding.domain}/o/${duplicate.id}`,
      "Responda 1 para somar a sua foto a ele (e confirmar que continua), ou 2 se é outro problema.",
    ].join("\n\n"),
  };
}

/** Why a number can't register here, before any question is asked. */
export function accountReply(
  reason: "unlinked" | "nick" | "unavailable" | { refused: string },
  muni: Municipality,
): string {
  const site = `https://${muni.branding.domain}`;
  if (reason === "unlinked")
    return `Para registrar por aqui, este número precisa de uma conta no ${muni.branding.name}. Entre uma vez em ${site}/entrar com este celular e escolha um apelido. Depois, mande REGISTRAR.`;
  if (reason === "nick")
    return `Antes de registrar, escolha um apelido: entre em ${site}/voce com este celular. Depois, mande REGISTRAR.`;
  if (reason === "unavailable")
    return `O registro por WhatsApp não está funcionando agora. Tente mais tarde, ou registre em ${site}/mapa.`;
  return reason.refused;
}

/** What the person reads once the app answered. */
export function reportDoneReply(
  result:
    | { kind: "published"; id: string; digest: "hoje" | "amanhã"; held: boolean }
    | { kind: "joined"; id: string }
    | { kind: "refused"; error: string },
  muni: Municipality,
): string {
  const link = (id: string) => `https://${muni.branding.domain}/o/${id}`;
  switch (result.kind) {
    case "published":
      return result.held
        ? `Recebido, código ${result.id}. Ele passa pela moderação antes de aparecer no mapa: ${link(result.id)}`
        : `Registrado, código ${result.id}: ${link(result.id)}\n\nAs fotos aparecem depois que a moderação olhar. Entra no resumo para a Prefeitura ${result.digest === "hoje" ? "de hoje, às 18h" : "de amanhã, às 18h"}.`;
    case "joined":
      return `Pronto, sua foto foi somada ao registro ${result.id}: ${link(result.id)}\n\nEla aparece depois que a moderação olhar.`;
    case "refused":
      return `Não deu para publicar: ${result.error}`;
  }
}
