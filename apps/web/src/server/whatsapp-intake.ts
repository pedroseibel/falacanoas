import {
  findDuplicate,
  REPORT,
  reportSchema,
  VisibilitySchema,
  WHATSAPP_AUDIENCE,
  WHATSAPP_CONNECTION,
  type ReportFields,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
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

/** Development's token when .dev.vars sets none; apps/whatsapp has the same. */
const DEV_TOKEN = "desenvolvimento-whatsapp-app-00000000000000";

const Point = { lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) };
const IntakeSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("conta") }),
  z.object({ acao: z.literal("parecido"), categoria: z.string().max(40), ...Point }),
  z.object({
    acao: z.literal("publicar"),
    categoria: z.string().max(40),
    texto: z.string().max(REPORT.maxText).default(""),
    referencia: z.string().max(REPORT.maxReference).default(""),
    visibilidade: VisibilitySchema,
    ...Point,
  }),
  z.object({ acao: z.literal("somar"), item: z.string().min(4).max(12), visibilidade: VisibilitySchema }),
]);

const schema = reportSchema(canoas);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The WhatsApp service's bearer token; without one (32+ characters) production keeps the door shut. */
function fromService(request: Request): boolean {
  const token = process.env.WHATSAPP_APP_TOKEN || (import.meta.env.DEV ? DEV_TOKEN : "");
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return token.length >= 32 && sameText(given, token);
}

export async function whatsappIntake(request: Request): Promise<Response> {
  if (!fromService(request)) return json({ ok: false }, 401);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "Envio inválido." }, 400);
  const token = form.get("assertion");
  const a = typeof token === "string" ? await readAssertion(token, Date.now(), WHATSAPP_AUDIENCE) : null;
  if (!a) return json({ ok: false }, 401);
  const fields = Object.fromEntries([...form].filter((e): e is [string, string] => typeof e[1] === "string"));
  const input = IntakeSchema.safeParse(fields);
  if (!input.success) return json({ ok: false, error: "Envio inválido." }, 400);

  const who = await memberOf(a.sub);
  if ("error" in who) return json(who);
  const photos = form.getAll("foto").filter((f) => f instanceof File);
  const v = input.data;
  switch (v.acao) {
    case "conta":
      return json({ ok: true, nick: who.nick });
    case "parecido": {
      const dup = findDuplicate(await listItems(), v.categoria, [v.lng, v.lat]);
      return json({
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
        location: [v.lng, v.lat],
        text: v.texto.trim(),
        visibility: v.visibilidade,
      };
      const parsed = schema.safeParse(report);
      if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." });
      const r = await publishReport(who, parsed.data, WHATSAPP_CONNECTION);
      return json(r.ok ? { ok: true, id: r.item.id, digest: r.digest, held: r.item.moderation === "pending" } : r);
    }
    case "somar": {
      const r = await joinReport(who, { itemId: v.item, visibility: v.visibilidade, photos }, WHATSAPP_CONNECTION);
      return json(r.ok ? { ok: true, id: r.item.id, confirmation: r.confirmation } : r);
    }
  }
}
