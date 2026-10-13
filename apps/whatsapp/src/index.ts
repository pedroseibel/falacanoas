import { canoas } from "@fala/instance-canoas";
import { Elysia, t } from "elysia";
import { loadConfig } from "./config";
import { provider } from "./provider";
import { connect } from "./service";

/**
 * The project's WhatsApp number, inbound (DECISIONS rounds 12 and 17; BUILD 3.2): people confirm
 * their place in a bairro's queue by sending the pre-filled code, or leave it with SAIR. Sign-in codes
 * don't pass through here: the vault sends them itself, so the phone never leaves it.
 */

const config = loadConfig();
const { handle, sender } = connect(config);
const development = config.mode === "development";

const app = new Elysia()
  .get("/saude", () => ({
    mode: config.mode,
    number: canoas.branding.whatsapp ?? null,
    provider: provider ? "configurado" : null,
    sender: sender.name,
  }))
  .post("/webhook", async ({ request, status }) => {
    if (!provider) return status(501, "Nenhum provedor de WhatsApp configurado.");
    const body = await request.text();
    if (!(await provider.verify(request, body))) return status(401, "Assinatura inválida.");
    // In order: "CONFIRMAR" then "SAIR" in one delivery must end with the sign-up gone.
    await provider.parse(body).reduce<Promise<unknown>>((done, msg) => done.then(() => handle(msg)), Promise.resolve());
    return "ok";
  });

// Development: a message as if it came from WhatsApp.
if (development)
  app.post("/dev/mensagem", ({ body }) => handle(body), {
    body: t.Object({ from: t.String({ pattern: "^\\d{10,15}$" }), text: t.String({ maxLength: 4096 }) }),
  });

app.listen(config.port);
console.log(`WhatsApp (${config.mode}) em :${config.port}`);
