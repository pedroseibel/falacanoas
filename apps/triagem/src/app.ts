import { Elysia } from "elysia";
import type { Config } from "./config";
import type { Box } from "./geometry";
import { MODELS } from "./models";
import type { Screening } from "./screen";

/** The largest photo the app sends: its own limit (core's REPORT.photoBytes) with room to spare. */
const MAX_BYTES = 12 * 1024 * 1024;

export interface Engine {
  screen: (bytes: Uint8Array) => Promise<Screening>;
  blur: (bytes: Uint8Array, boxes: Box[]) => Promise<{ bytes: Buffer; type: string }>;
}

/**
 * The screening API (DECISIONS round 20). The app posts a photo's bytes and gets back the nudity score
 * and the faces and plates found; `/borrar` returns the copy with those blurred. Nothing is stored:
 * photos exist here only for the length of a request, and nothing is logged about them.
 */
export function buildApp(config: Config, engine: Engine) {
  const authorised = (header: string | undefined) => !config.token || header === `Bearer ${config.token}`;
  const body = async (request: Request): Promise<Uint8Array | Response> => {
    if (!authorised(request.headers.get("authorization") ?? undefined))
      return new Response("Não autorizado.", { status: 401 });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return new Response("Foto vazia ou grande demais.", { status: 413 });
    return bytes;
  };
  return new Elysia()
    .get("/saude", () => ({ ok: true, models: Object.values(MODELS).map((m) => m.file) }))
    .post("/triagem", async ({ request }) => {
      const bytes = await body(request);
      if (bytes instanceof Response) return bytes;
      return engine.screen(bytes).catch(() => new Response("Não deu para ler a imagem.", { status: 422 }));
    })
    .post("/borrar", async ({ request }) => {
      const bytes = await body(request);
      if (bytes instanceof Response) return bytes;
      try {
        const found = await engine.screen(bytes);
        const out = await engine.blur(bytes, [...found.faces, ...found.plates]);
        return new Response(new Uint8Array(out.bytes), {
          headers: {
            "content-type": out.type,
            "x-faces": String(found.faces.length),
            "x-plates": String(found.plates.length),
          },
        });
      } catch {
        return new Response("Não deu para ler a imagem.", { status: 422 });
      }
    });
}
