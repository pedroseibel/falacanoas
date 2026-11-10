import { reportSchema } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { JoinSchema, readJoinFormData, readReportFormData } from "@/features/report/report-model";
import { member } from "./member";
import { formData } from "./photo-intake";
import {
  joinReport as join,
  publishGuestReport,
  publishReport,
  type JoinResult,
  type ReportResult,
} from "./report-store";
import { getSession } from "./session";
import { isHuman } from "./vault";

export type { JoinResult, ReportResult } from "./report-store";

/**
 * The report flow's writes (research/DECISIONS.md, rounds 2, 3, 4, 6, 15 and 18). Posting needs a
 * phone-verified account with an apelido, or, as a guest, a photo and a robot check: a guest pin is
 * held for moderation and followed through a secret link.
 */

const schema = reportSchema(canoas);

export const createReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<ReportResult> => {
    const session = (await getSession())?.user;
    if (session?.isAnonymous) return createGuestPin(data, session.id);
    const who = await member();
    if ("error" in who) return who;
    const parsed = schema.safeParse(readReportFormData(data));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
    const key = z.uuid().safeParse(data.get("chave"));
    return publishReport(who, parsed.data, undefined, key.success ? key.data : undefined);
  });

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export const joinReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<JoinResult> => {
    const who = await member();
    if ("error" in who) return who;
    const parsed = JoinSchema.safeParse(readJoinFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o registro." };
    return join(who, parsed.data);
  });

/** A guest's report: an occurrence only, with a photo (the schema asks for one) and past the robot check. */
async function createGuestPin(data: FormData, guestId: string): Promise<ReportResult> {
  const parsed = schema.safeParse(readReportFormData(data));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
  if (parsed.data.kind !== "occurrence")
    return { ok: false, error: "Sem conta, dá para registrar um problema num lugar. Questões públicas pedem celular." };
  const token = data.get("turnstile");
  if (!(await isHuman(typeof token === "string" ? token : null)))
    return {
      ok: false,
      error:
        "A verificação anti-robô não passou. Tente publicar de novo; se continuar, recarregue a página (as fotos escolhidas se perdem).",
    };
  return publishGuestReport(guestId, parsed.data);
}
