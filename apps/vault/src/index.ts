import {
  connectionFromHeaders,
  ConnectionSchema,
  CONTENT_REPORT_ACTION,
  EvidenceActionSchema,
  DATA_REQUEST_ACTION,
  GUEST_PIN_ACTION,
  importVaultKey,
  isBrazilianMobileE164,
} from "@fala/core";
import { WorkerEntrypoint } from "cloudflare:workers";
import { z } from "zod";
import { importVaultKeys, type VaultKeys } from "./crypto";
import { closeAccount, sendCode, sendReauthCode, verifyCode, type Gateway, type Outbox } from "./gateway";
import { beginChange, sendChangeCode, takeChange, verifyChangeCode } from "./number-change";
import { outbox, peekDevCode } from "./outbox";
import { openStore } from "./store";
import { turnstile } from "./turnstile";

export interface Env {
  /** The vault's own database role: fala_cofre only. */
  VAULT_DATABASE_URL: string;
  VAULT_KEY_VERSION: string;
  /** JSON: { "<version>": "<base64 32 bytes>" }. */
  VAULT_SEAL_KEYS: string;
  VAULT_MAC_KEYS: string;
  /** Ed25519 private JWK; the app holds only the public half. */
  VAULT_SIGNING_KEY: string;
  TURNSTILE_SECRET_KEY?: string;
  /** The instance's host, which real Turnstile tokens must name. */
  TURNSTILE_HOSTNAME?: string;
  /** "development" in .dev.vars only: test Turnstile secret, codes shown instead of sent. */
  VAULT_MODE?: string;
}

/** Keys are imported once per isolate. */
let imported: Promise<{ keys: VaultKeys; signingKey: CryptoKey }> | null = null;
const importKeys = (env: Env) =>
  (imported ??= Promise.all([importVaultKeys(env), importVaultKey(env.VAULT_SIGNING_KEY, "sign")]).then(
    ([keys, signingKey]) => ({ keys, signingKey }),
  ));

const BodySchema = z
  .object({ telefone: z.unknown(), token: z.unknown(), codigo: z.unknown(), ticket: z.unknown() })
  .partial();

const STATUS = {
  invalid: 400,
  robot: 403,
  expired: 410,
  same: 409,
  taken: 409,
  rate: 429,
  send: 503,
} satisfies Record<string, number>;

const ACTIONS = {
  "/api/identidade/codigo": "send",
  "/api/identidade/verificar": "verify",
  "/api/identidade/troca/codigo": "change-send",
  "/api/identidade/troca/verificar": "change-verify",
} satisfies Record<string, string>;
const isRoute = (path: string): path is keyof typeof ACTIONS => path in ACTIONS;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

/**
 * The identity vault (DECISIONS round 18, Q29). Over HTTP, the auth gateway: a route sends
 * /api/identidade/* on the instance's domain here, so the phone never passes through the app. Over
 * RPC (the app's service binding), only what the app may ask: that an account signed in.
 */
export default class Vault extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const development = this.env.VAULT_MODE === "development";

    if (request.method === "GET" && url.pathname === "/api/identidade/dev/codigo") {
      const phone = url.searchParams.get("telefone") ?? "";
      if (!development || !isBrazilianMobileE164(phone)) return json({ codigo: null }, 404);
      return json({ codigo: peekDevCode(phone) });
    }
    if (request.method !== "POST") return json({ ok: false }, 404);

    if (!isRoute(url.pathname)) return json({ ok: false }, 404);
    const action = ACTIONS[url.pathname];
    const body = BodySchema.safeParse(await request.json().catch(() => null));
    const input = body.success ? body.data : {};
    const ip = request.headers.get("cf-connecting-ip");
    const now = new Date();

    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      const g = await this.gateway(db.store);
      if (action === "send") {
        const r = await sendCode(g, { phone: input.telefone, token: input.token, ip, now });
        return r.ok ? json({ ok: true }) : json(r, STATUS[r.error]);
      }
      if (action === "verify") {
        const r = await verifyCode(g, { phone: input.telefone, code: input.codigo, ip, now });
        return r.ok ? json({ ok: true, assertion: r.assertion }) : json(r, STATUS[r.error]);
      }
      // Changing number (round 18, Q20): the ticket stands for the re-authentication the app checked.
      if (action === "change-send") {
        const r = await sendChangeCode(g, { ticket: input.ticket, phone: input.telefone, ip, now });
        return r.ok ? json({ ok: true }) : json(r, STATUS[r.error]);
      }
      const r = await verifyChangeCode(g, { ticket: input.ticket, phone: input.telefone, code: input.codigo, ip, now });
      if (!r.ok) return json(r, STATUS[r.error]);
      await db.recordEvidence({
        action: "phone_changed",
        accountId: r.accountId,
        itemId: null,
        connection: connectionFromHeaders(request.headers),
        at: now,
      });
      return json({ ok: true });
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  private async gateway(store: Gateway["store"], delivery?: Outbox): Promise<Gateway> {
    const development = this.env.VAULT_MODE === "development";
    const { keys, signingKey } = await importKeys(this.env);
    return {
      store,
      keys,
      signingKey,
      outbox: delivery ?? outbox(development),
      human: turnstile(this.env, development),
    };
  }

  /**
   * RPC: a code to the account's own number, before closing the account or changing the number. The
   * app gets the masked number to show; in development, the code too, since nothing is sent.
   */
  async reauthCode(
    accountId: unknown,
  ): Promise<{ ok: true; hint: string; devCode: string | null } | { ok: false; error: "unlinked" | "rate" | "send" }> {
    const id = z.uuid().parse(accountId);
    const development = this.env.VAULT_MODE === "development";
    const base = outbox(development);
    let sent: string | null = null;
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      const g = await this.gateway(db.store, {
        async deliver(phone, code) {
          await base.deliver(phone, code);
          sent = code;
        },
        notice: (phone, text) => base.notice(phone, text),
      });
      const r = await sendReauthCode(g, { accountId: id, now: new Date() });
      return r.ok ? { ...r, devCode: development ? sent : null } : r;
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /** RPC: closes the account once the code checks out; recorded as access evidence (round 18, Q21, Q26). */
  async close(
    accountId: unknown,
    code: unknown,
    connection: unknown,
  ): Promise<{ ok: true } | { ok: false; error: "invalid" }> {
    const id = z.uuid().parse(accountId);
    const now = new Date();
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      const r = await closeAccount(await this.gateway(db.store), { accountId: id, code, now });
      if (r.ok)
        await db.recordEvidence({
          action: "account_closed",
          accountId: id,
          itemId: null,
          connection: emptyOr(connection),
          at: now,
        });
      return r;
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /**
   * RPC: starts a number change once the person re-authenticated, by the code to their number or by
   * signing in moments ago (`fresh`, which the app checked). The ticket goes to the browser, which
   * brings it here with the new number.
   */
  async beginChange(
    accountId: unknown,
    code: unknown,
    fresh: unknown,
  ): Promise<{ ok: true; ticket: string } | { ok: false; error: "invalid" }> {
    const id = z.uuid().parse(accountId);
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      return await beginChange(await this.gateway(db.store), {
        accountId: id,
        code,
        fresh: fresh === true,
        now: new Date(),
      });
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /** RPC: the account's finished change (the new hint and when), read once, for the app to update and end other sessions. */
  async takeChange(accountId: unknown): Promise<{ hint: string; verifiedAt: Date } | null> {
    const id = z.uuid().parse(accountId);
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      return await takeChange(await this.gateway(db.store), { accountId: id, now: new Date() });
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /** RPC: the account signed in some other way (a passkey); it counts against the 180-day rule. */
  async signedIn(accountId: string, connection: unknown): Promise<void> {
    if (!z.uuid().safeParse(accountId).success) return;
    const now = new Date();
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      await db.touchAccount(accountId, now);
      await db.recordEvidence({ action: "sign_in", accountId, itemId: null, connection: emptyOr(connection), at: now });
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /** RPC: write-only access evidence for an action the app performed (round 18, Q21). */
  async record(input: unknown): Promise<void> {
    const e = RecordSchema.parse(input);
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      await db.recordEvidence({ ...e, at: new Date() });
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }

  /**
   * RPC: a Turnstile token from a guest pin, a data-subject request or a visitor's report, checked
   * with the vault's secret, which the app never holds. A token minted for one can't pass for another.
   */
  async human(token: unknown, ip: unknown, action: unknown = GUEST_PIN_ACTION): Promise<boolean> {
    if (typeof token !== "string" || !token || token.length > 4096) return false;
    if (action !== GUEST_PIN_ACTION && action !== DATA_REQUEST_ACTION && action !== CONTENT_REPORT_ACTION) return false;
    const check = turnstile(this.env, this.env.VAULT_MODE === "development", action);
    return check(token, typeof ip === "string" ? ip : null);
  }

  /** Daily: 6-month deletion, sparing what preservation holds cover (round 18, Q23). */
  async scheduled(): Promise<void> {
    const db = await openStore(this.env.VAULT_DATABASE_URL);
    try {
      const r = await db.purge(new Date());
      console.info(
        `cofre: apagados ${r.evidence} registros de acesso e ${r.links} vínculos antigos; ${r.holds} preservações ativas`,
      );
    } finally {
      this.ctx.waitUntil(db.close());
    }
  }
}

const NO_CONNECTION = {
  clientIp: null,
  clientPort: null,
  ipVersion: null,
  edgeIp: null,
  edgePort: null,
  transport: null,
  cfRay: null,
} satisfies z.infer<typeof ConnectionSchema>;

const emptyOr = (c: unknown) => ConnectionSchema.safeParse(c).data ?? NO_CONNECTION;

const RecordSchema = z.object({
  action: EvidenceActionSchema,
  accountId: z.uuid().nullable(),
  itemId: z.string().max(12).nullable(),
  connection: ConnectionSchema,
});
