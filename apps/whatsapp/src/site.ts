import type { ReportDraft } from "@fala/core";
import { z } from "zod";
import type { AccountCheck, ReportResult, Reports, Visibility } from "./conversation";

/**
 * The site, for registering by WhatsApp (core whatsapp-report.ts). For each step the vault first
 * names the account behind the number (/api/identidade/whatsapp/conta: the number goes to the vault,
 * a two-minute assertion comes back), then the app acts for that account (/api/whatsapp/registro).
 * The app never gets the number. Both sit on the instance's domain: in production a route sends
 * /api/identidade/* to the vault; in development the app forwards it.
 */

const Assertion = z.object({ ok: z.literal(true), assertion: z.string() });
const Refusal = z.object({ ok: z.literal(false), error: z.string(), missing: z.enum(["account", "nick"]).optional() });
const Account = z.union([z.object({ ok: z.literal(true), nick: z.string() }), Refusal]);
const Similar = z.object({
  ok: z.literal(true),
  duplicate: z.object({ id: z.string(), meters: z.number(), title: z.string() }).nullable(),
});
const Published = z.union([
  z.object({ ok: z.literal(true), id: z.string(), digest: z.enum(["hoje", "amanhã"]), held: z.boolean() }),
  Refusal,
]);
const Joined = z.union([z.object({ ok: z.literal(true), id: z.string() }), Refusal]);

class Unlinked extends Error {}

const point = (d: ReportDraft) => {
  if (!d.location || !d.category) throw new Error("rascunho incompleto");
  return { categoria: d.category, lng: String(d.location[0]), lat: String(d.location[1]) };
};
const refused = (r: z.infer<typeof Refusal>): ReportResult => ({ kind: "refused", error: r.error });

export function site(config: { url: string; vaultToken: string; appToken: string }, fetcher: typeof fetch = fetch) {
  async function assertion(from: string): Promise<string> {
    const r = await fetcher(`${config.url}/api/identidade/whatsapp/conta`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.vaultToken}`, "content-type": "application/json" },
      body: JSON.stringify({ de: from }),
    });
    if (r.status === 404) throw new Unlinked();
    if (!r.ok) throw new Error(`cofre: ${r.status}`);
    return Assertion.parse(await r.json()).assertion;
  }

  async function ask<T>(schema: z.ZodType<T>, from: string, fields: Record<string, string>, photos: Uint8Array[] = []) {
    const form = new FormData();
    form.set("assertion", await assertion(from));
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    photos.forEach((bytes, i) =>
      form.append("foto", new File([new Uint8Array(bytes)], `foto-${i + 1}.jpg`, { type: "image/jpeg" })),
    );
    const r = await fetcher(`${config.url}/api/whatsapp/registro`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.appToken}` },
      body: form,
    });
    if (!r.ok) throw new Error(`site: ${r.status}`);
    return schema.parse(await r.json());
  }

  const reports: Reports = {
    async account(from) {
      const r = await ask(Account, from, { acao: "conta" }).catch((e: unknown) => {
        if (e instanceof Unlinked)
          return { ok: false, error: "", missing: "account" } satisfies z.infer<typeof Refusal>;
        throw e;
      });
      if (r.ok) return { ok: true, nick: r.nick };
      const reason: Extract<AccountCheck, { ok: false }>["reason"] =
        r.missing === "account" ? "unlinked" : r.missing === "nick" ? "nick" : { refused: r.error };
      return { ok: false, reason };
    },
    async similar(from, draft) {
      return (await ask(Similar, from, { acao: "parecido", ...point(draft) })).duplicate;
    },
    async publish(from, draft, visibility: Visibility, photos) {
      const r = await ask(
        Published,
        from,
        {
          acao: "publicar",
          ...point(draft),
          texto: draft.text,
          referencia: draft.reference,
          alagamento: JSON.stringify(draft.flooding),
          visibilidade: visibility,
        },
        photos,
      );
      return r.ok ? { kind: "published", id: r.id, digest: r.digest, held: r.held } : refused(r);
    },
    async join(from, itemId, visibility, photos) {
      const r = await ask(Joined, from, { acao: "somar", item: itemId, visibilidade: visibility }, photos);
      return r.ok ? { kind: "joined", id: r.id } : refused(r);
    },
  };
  return reports;
}
