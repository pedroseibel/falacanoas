import {
  accountReply,
  afterCheck,
  cancelsReport,
  judgeConfirmation,
  readIntent,
  REPORT_SESSION_MS,
  replyFor,
  reportDoneReply,
  reportTurn,
  startsReport,
  whatsappVariants,
  type Intent,
  type Municipality,
  type Outcome,
  type ReportDraft,
  type ReportSession,
  type WaMessage,
  type WhatsappSignup,
} from "@fala/core";

/**
 * One message in, one reply out (BUILD 3.2). The rules are core's (whatsapp.ts for the queue,
 * whatsapp-report.ts for registering a problem); this is the order of the I/O, apart from Postgres,
 * the site and the provider so it's tested without any of them.
 */

export interface SignupStore {
  /** The WhatsApp sign-up behind any of these forms of the number. */
  find(numbers: string[]): Promise<(WhatsappSignup & { id: string }) | null>;
  /** Confirms it (once) and returns how many are confirmed in its bairro now. */
  confirm(id: string, neighborhood: string): Promise<number>;
  /** Deletes the sign-up behind these numbers; its bairro, or null if there was none. */
  leave(numbers: string[]): Promise<string | null>;
}

export interface Sender {
  /** The transport's name ("arquivo" in development). */
  name: string;
  /** Throws when the message didn't go out. */
  send(to: string, text: string): Promise<void>;
}

/** A message as the provider delivered it. `from`: the sender's WhatsApp id, digits with the country code. */
export type Inbound = { from: string } & WaMessage;

export type Visibility = "pseudonymous" | "anonymous";
export type AccountCheck =
  { ok: true; nick: string } | { ok: false; reason: "unlinked" | "nick" | "unavailable" | { refused: string } };
export type ReportResult = Parameters<typeof reportDoneReply>[0];

/** The site's side of a report, for the number that wrote (site.ts). Throws when the site can't be reached. */
export interface Reports {
  account(from: string): Promise<AccountCheck>;
  similar(from: string, draft: ReportDraft): Promise<{ id: string; meters: number; title: string } | null>;
  publish(from: string, draft: ReportDraft, visibility: Visibility, photos: Uint8Array[]): Promise<ReportResult>;
  join(from: string, itemId: string, visibility: Visibility, photos: Uint8Array[]): Promise<ReportResult>;
}

/** The photo behind a provider's media id, ready for the site (photos.ts); null if it isn't a readable image. */
export type Photos = (mediaId: string) => Promise<Uint8Array | null>;

/** What became of a message: the queue's outcome, or a step in a report; the reply and whether it went out. */
export interface Handled {
  outcome: Outcome | { kind: "report" };
  reply: string | null;
  sent: boolean;
}

const DAY_MS = 86_400_000;
/** "No account yet" goes once every 10 minutes: four photos sent together get one answer. */
const ACCOUNT_REPLY_MS = 10 * 60_000;

interface Draft {
  session: ReportSession;
  /** The photos already read, by media id, for publishing. */
  photos: Map<string, Uint8Array>;
}

export function conversation(deps: {
  store: SignupStore;
  sender: Sender;
  muni: Municipality;
  /** Registering problems; without it the number only handles the queue. */
  reports?: { site: Reports; photos: Photos } | null;
}) {
  const { store, sender, muni } = deps;
  const reports = deps.reports ?? null;
  /** "What this number does" goes once a day per number, so two bots can't keep answering each other. */
  const told = new Map<string, number>();
  const toldAccount = new Map<string, number>();
  /**
   * Reports in progress, in memory: a restart loses them, and the person starts again. Nothing of a
   * draft is stored.
   */
  const drafts = new Map<string, Draft>();
  /** One message at a time per number: photos sent together arrive as simultaneous deliveries. */
  const lines = new Map<string, Promise<unknown>>();

  async function queueOutcome(intent: Intent, from: string): Promise<Outcome> {
    const numbers = whatsappVariants(from);
    if (intent.kind === "leave") {
      const left = await store.leave(numbers);
      return left ? { kind: "left", neighborhood: left } : { kind: "nothing-to-leave" };
    }
    if (intent.kind === "other") return { kind: "other" };
    const signup = await store.find(numbers);
    const judged = judgeConfirmation(signup, intent.code);
    if (judged || !signup) return judged ?? { kind: "unknown" };
    return {
      kind: "confirmed",
      neighborhood: signup.neighborhood,
      confirmedInBairro: await store.confirm(signup.id, signup.neighborhood),
    };
  }

  const send = (to: string, reply: string) =>
    sender.send(to, reply).then(
      () => true,
      (e: unknown) => {
        console.error(`resposta não enviada: ${String(e)}`);
        return false;
      },
    );

  /** A message inside a report, or one that starts it. Returns the reply. */
  async function reportMessage(
    msg: Inbound,
    live: Draft | null,
    site: Reports,
    photosOf: Photos,
    now: number,
  ): Promise<string | null> {
    if (!live) {
      const account = await site.account(msg.from).catch((): AccountCheck => ({ ok: false, reason: "unavailable" }));
      if (!account.ok) {
        const last = toldAccount.get(msg.from);
        if (last !== undefined && now - last < ACCOUNT_REPLY_MS) return null;
        toldAccount.set(msg.from, now);
        return accountReply(account.reason, muni);
      }
    }
    const photos = live?.photos ?? new Map<string, Uint8Array>();
    if (msg.kind === "image") {
      const bytes = await photosOf(msg.mediaId).catch(() => null);
      if (!bytes) return "Não deu para ler essa foto. Mande outra, como foto (não como documento).";
      photos.set(msg.mediaId, bytes);
    }

    let turn = reportTurn(live?.session ?? null, msg, muni, now);
    let reply = turn.reply;
    const need = turn.need;
    if (need?.kind === "check" && turn.session) {
      const dup = await site.similar(msg.from, turn.session.draft).catch(() => undefined);
      if (dup === undefined) {
        turn = { session: live?.session ?? turn.session, reply: null };
        reply = "Não deu para continuar agora. Mande a descrição de novo daqui a pouco, ou PULAR.";
      } else {
        turn = afterCheck(turn.session, dup, muni, now);
        reply = turn.reply;
      }
    } else if ((need?.kind === "publish" || need?.kind === "join") && live) {
      const { draft } = live.session;
      const files = draft.photos.flatMap((id) => photos.get(id) ?? []);
      const done = await (
        need.kind === "publish"
          ? site.publish(msg.from, draft, need.visibility, files)
          : site.join(msg.from, need.itemId, need.visibility, files)
      ).catch(() => null);
      if (!done) {
        // Kept as it was, so SIM tries again.
        drafts.set(msg.from, { session: { ...live.session, updatedAt: now }, photos });
        return "Não deu para publicar agora. Responda SIM de novo daqui a pouco, ou CANCELAR.";
      }
      reply = reportDoneReply(done, muni);
    }
    if (turn.session) {
      // Photos the draft didn't take (past the limit) aren't kept.
      for (const id of photos.keys()) if (!turn.session.draft.photos.includes(id)) photos.delete(id);
      drafts.set(msg.from, { session: turn.session, photos });
    } else drafts.delete(msg.from);
    return reply;
  }

  async function run(msg: Inbound, now: number): Promise<Handled> {
    const held = drafts.get(msg.from);
    const live = held && now - held.session.updatedAt < REPORT_SESSION_MS ? held : null;
    if (held && !live) drafts.delete(msg.from);

    // The queue first: "CONFIRMAR XXXX" and "SAIR" always work. During a report, a bare code is read
    // as part of it, and CANCELAR ends the report instead of the sign-up.
    if (msg.kind === "text") {
      const intent = readIntent(msg.text);
      const forQueue =
        intent.kind === "confirm"
          ? !live || /^\s*confirmar/i.test(msg.text)
          : intent.kind === "leave" && !(live && cancelsReport(msg));
      if (forQueue) {
        const outcome = await queueOutcome(intent, msg.from);
        const reply = replyFor(outcome, muni);
        // The confirmation stands even if the reply fails: the person's own message was the proof.
        return { outcome, reply, sent: await send(msg.from, reply) };
      }
    }

    if (reports && (live || startsReport(msg))) {
      const reply = await reportMessage(msg, live, reports.site, reports.photos, now);
      return { outcome: { kind: "report" }, reply, sent: reply ? await send(msg.from, reply) : false };
    }

    const outcome: Outcome = { kind: "other" };
    const last = told.get(msg.from);
    if (last !== undefined && now - last < DAY_MS) return { outcome, reply: null, sent: false };
    told.set(msg.from, now);
    const reply = replyFor(outcome, muni, { reporting: reports !== null });
    return { outcome, reply, sent: await send(msg.from, reply) };
  }

  return function handle(msg: Inbound, now = Date.now()) {
    const turn = (lines.get(msg.from) ?? Promise.resolve()).then(() => run(msg, now));
    const settled = turn.catch(() => undefined);
    lines.set(msg.from, settled);
    void settled.then(() => {
      if (lines.get(msg.from) === settled) lines.delete(msg.from);
    });
    return turn;
  };
}
