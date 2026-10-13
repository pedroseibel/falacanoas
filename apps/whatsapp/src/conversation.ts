import {
  judgeConfirmation,
  readIntent,
  replyFor,
  whatsappVariants,
  type Municipality,
  type Outcome,
  type WhatsappSignup,
} from "@fala/core";

/**
 * One message in, one reply out (BUILD 3.2). The rules are core's (whatsapp.ts); this is the order of
 * the I/O, apart from Postgres and the provider so it's tested without either.
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

export interface Inbound {
  /** The sender's WhatsApp id: digits with the country code. */
  from: string;
  text: string;
}

const DAY_MS = 86_400_000;

export function conversation(deps: { store: SignupStore; sender: Sender; muni: Municipality }) {
  const { store, sender, muni } = deps;
  /** "Only confirms sign-ups" goes once a day per number, so two bots can't keep answering each other. */
  const told = new Map<string, number>();

  async function outcomeOf(msg: Inbound): Promise<Outcome> {
    const numbers = whatsappVariants(msg.from);
    const intent = readIntent(msg.text);
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

  return async function handle(msg: Inbound, now = Date.now()) {
    const outcome = await outcomeOf(msg);
    if (outcome.kind === "other") {
      const last = told.get(msg.from);
      if (last !== undefined && now - last < DAY_MS) return { outcome, reply: null, sent: false };
      told.set(msg.from, now);
    }
    const reply = replyFor(outcome, muni);
    // The confirmation stands even if the reply fails: the person's own message was the proof.
    const sent = await sender.send(msg.from, reply).then(
      () => true,
      (e: unknown) => {
        console.error(`resposta não enviada: ${String(e)}`);
        return false;
      },
    );
    return { outcome, reply, sent };
  };
}
