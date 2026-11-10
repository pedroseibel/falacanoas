import {
  DEV_WHATSAPP_APP_TOKEN,
  findDuplicate,
  hasBearer,
  type ReportFields,
  reportSchema,
  WHATSAPP_AUDIENCE,
  WHATSAPP_CONNECTION,
  WhatsappIntakeSchema,
  type WhatsappRefusal,
  WhatsappReply,
  type WhatsappReplyOf,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { listItems } from "./items";
import { memberOf } from "./member";
import { joinReport, publishReport } from "./report-store";
import { readAssertion } from "./vault";

/**
 * Registering by WhatsApp, the app's side (core whatsapp-report.ts; apps/whatsapp). The WhatsApp
 * service holds the conversation; for each step that needs the app it brings its token and a vault
 * assertion naming the account behind the number (audience "fala-whatsapp", two minutes), never the
 * number. The same rules as the report form follow: the member check, the daily limits, the
 * pre-screen, the photos' moderation and known-material check, the access evidence. Server-only.
 */

const schema = reportSchema(canoas);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

/** The WhatsApp service's bearer token; without one (32+ characters) production keeps the door shut. */
function fromService(request: Request): boolean {
  const token = process.env.WHATSAPP_APP_TOKEN || (import.meta.env.DEV ? DEV_WHATSAPP_APP_TOKEN : "");
  return token.length >= 32 && hasBearer(request.headers.get("authorization"), token);
}

export async function whatsappIntake(request: Request): Promise<Response> {
  if (!fromService(request)) return json({ ok: false }, 401);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "Envio inválido." }, 400);
  const token = form.get("assertion");
  const a = typeof token === "string" ? await readAssertion(token, Date.now(), WHATSAPP_AUDIENCE) : null;
  if (!a) return json({ ok: false }, 401);
  const fields = Object.fromEntries([...form].filter((e): e is [string, string] => typeof e[1] === "string"));
  const input = WhatsappIntakeSchema.safeParse(fields);
  if (!input.success) return json({ ok: false, error: "Envio inválido." }, 400);

  /** The answer to one action, in the shape the service parses it with. */
  const reply = <A extends keyof typeof WhatsappReply>(_acao: A, body: WhatsappReplyOf<A>) => json(body);
  const who = await memberOf(a.sub);
  if ("error" in who) return json(who satisfies WhatsappRefusal);
  const photos = form.getAll("foto").filter((f) => f instanceof File);
  const v = input.data;
  switch (v.acao) {
    case "conta":
      return reply("conta", { ok: true, nick: who.nick });
    case "parecido": {
      const dup = findDuplicate(await listItems(), v.categoria, [v.lng, v.lat]);
      return reply("parecido", {
        ok: true,
        duplicate: dup && { id: dup.item.id, meters: dup.meters, title: dup.item.title },
      });
    }
    case "publicar": {
      const report: ReportFields = {
        kind: "occurrence",
        photos,
        category: v.categoria,
        title: "",
        reach: "place",
        place: "",
        neighborhood: "",
        reference: v.referencia.trim(),
        flooding: v.alagamento,
        location: [v.lng, v.lat],
        text: v.texto.trim(),
        visibility: v.visibilidade,
      };
      const parsed = schema.safeParse(report);
      if (!parsed.success)
        return reply("publicar", { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." });
      const r = await publishReport(who, parsed.data, WHATSAPP_CONNECTION);
      return reply(
        "publicar",
        r.ok ? { ok: true, id: r.item.id, digest: r.digest, held: r.item.moderation === "pending" } : r,
      );
    }
    case "somar": {
      const r = await joinReport(who, { itemId: v.item, visibility: v.visibilidade, photos }, WHATSAPP_CONNECTION);
      return reply("somar", r.ok ? { ok: true, id: r.item.id } : r);
    }
  }
}
