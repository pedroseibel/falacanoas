import { canoas } from "@fala/instance-canoas";
import { Elysia, t } from "elysia";
import { loadConfig } from "./config";
import { provider } from "./provider";
import { connect, devMedia } from "./service";

/**
 * The project's WhatsApp number, inbound (DECISIONS rounds 12 and 17; BUILD 3.2): people confirm
 * their place in a bairro's queue by sending the pre-filled code, or leave it with SAIR; members
 * register problems (REGISTRAR or a photo; core whatsapp-report.ts). Sign-in codes don't pass through
 * here: the vault sends them itself, so the phone never leaves it.
 */

const config = loadConfig();
const { handle, sender, reports } = connect(config);
const development = config.mode === "development";

const app = new Elysia()
  .get("/saude", () => ({
    mode: config.mode,
    number: canoas.branding.whatsapp ?? null,
    provider: provider ? "configurado" : null,
    sender: sender.name,
    reporting: reports !== null,
  }))
  .post("/webhook", async ({ request, status }) => {
    if (!provider) return status(501, "Nenhum provedor de WhatsApp configurado.");
    const body = await request.text();
    if (!(await provider.verify(request, body))) return status(401, "Assinatura inválida.");
    // In order: "CONFIRMAR" then "SAIR" in one delivery must end with the sign-up gone.
    await provider.parse(body).reduce<Promise<unknown>>((done, msg) => done.then(() => handle(msg)), Promise.resolve());
    return "ok";
  });

// Development: a message as if it came from WhatsApp; a photo is a path on this machine.
if (development)
  app.post(
    "/dev/mensagem",
    ({ body }) => {
      const { from } = body;
      if (body.foto) return handle({ from, kind: "image", mediaId: devMedia(body.foto), caption: body.text });
      if (body.lat !== undefined && body.lng !== undefined)
        return handle({ from, kind: "location", lat: body.lat, lng: body.lng });
      return handle({ from, kind: "text", text: body.text ?? "" });
    },
    {
      body: t.Object({
        from: t.String({ pattern: "^\\d{10,15}$" }),
        text: t.Optional(t.String({ maxLength: 4096 })),
        foto: t.Optional(t.String({ maxLength: 1024 })),
        lat: t.Optional(t.Number()),
        lng: t.Optional(t.Number()),
      }),
    },
  );

app.listen(config.port);
console.log(`WhatsApp (${config.mode}) em :${config.port}`);
